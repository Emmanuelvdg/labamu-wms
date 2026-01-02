import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { createHmac } from 'crypto';

interface QuotationRequest {
    serviceType: string;
    language: string;
    stops: Array<{
        coordinates: { lat: string; lng: string };
        address: string;
    }>;
    scheduleAt?: string;
    specialRequests?: string[];
    item?: {
        quantity: string;
        weight: string;
        categories: string[];
    };
    isRouteOptimized?: boolean;
}

interface LalamoveStop {
    stopId?: string;
    name: string;
    phone: string;
}

interface LalamoveApiResponse {
    data: any;
}

interface QuotationResponse {
    data: {
        quotationId: string;
        priceBreakdown?: {
            total: string;
            currency: string;
        };
    };
}

interface OrderResponse {
    data: {
        orderId: string;
        shareLink: string;
        status: string;
        stops?: any[];
        priceBreakdown?: {
            total: string;
            currency: string;
        };
    };
}

interface OrderStatusResponse {
    data: {
        status: string;
        driverId?: string;
        priceBreakdown?: {
            total: string;
        };
        distance?: {
            value: string;
            unit: string;
        };
        stops: any[];
    };
}

@Injectable()
export class LalamoveService {
    private readonly logger = new Logger(LalamoveService.name);
    private readonly sandboxUrl = 'https://rest.sandbox.lalamove.com';
    private readonly productionUrl = 'https://rest.lalamove.com';

    constructor(private prisma: PrismaService) { }

    /**
     * Generate HMAC SHA256 signature for Lalamove API authentication
     */
    private generateSignature(
        timestamp: string,
        method: string,
        path: string,
        body: string,
        secret: string,
    ): string {
        const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
        return createHmac('sha256', secret).update(rawSignature).digest('hex');
    }

    /**
     * Get API credentials for a specific market
     * Supports market-specific credentials (e.g., LALAMOVE_API_KEY_SG for Singapore)
     * Falls back to global credentials if market-specific ones are not set
     */
    private getCredentialsForMarket(market: string): { apiKey: string | undefined; apiSecret: string | undefined } {
        const uppercaseMarket = market.toUpperCase();
        const marketKey = `LALAMOVE_API_KEY_${uppercaseMarket}`;
        const marketSecret = `LALAMOVE_API_SECRET_${uppercaseMarket}`;

        const marketSpecificKey = process.env[marketKey];
        const marketSpecificSecret = process.env[marketSecret];

        // Use market-specific credentials if available, otherwise fall back to global
        const apiKey = marketSpecificKey || process.env.LALAMOVE_API_KEY;
        const apiSecret = marketSpecificSecret || process.env.LALAMOVE_API_SECRET;

        // Debug logging
        this.logger.log(`[DEBUG] Looking for credentials for market: ${market}`);
        this.logger.log(`[DEBUG] Market key: ${marketKey}, Found: ${!!marketSpecificKey}`);
        this.logger.log(`[DEBUG] Global LALAMOVE_API_KEY exists: ${!!process.env.LALAMOVE_API_KEY}`);
        this.logger.log(`[DEBUG] Global LALAMOVE_API_SECRET exists: ${!!process.env.LALAMOVE_API_SECRET}`);

        if (marketSpecificKey && marketSpecificSecret) {
            this.logger.log(`Using market-specific credentials for ${market} (${marketKey})`);
        } else if (apiKey && apiSecret) {
            this.logger.log(`Using global credentials for ${market} (fallback)`);
        }

        return { apiKey, apiSecret };
    }

    /**
     * Make authenticated request to Lalamove API
     */
    private async makeRequest(
        warehouseId: string,
        method: string,
        path: string,
        body?: any,
    ): Promise<any> {
        const config = await this.prisma.lalamoveConfig.findUnique({
            where: { warehouseId },
        });

        const market = config?.market || 'TH'; // Default to TH if config missing
        const environment = config?.environment || 'SANDBOX';

        // Get market-specific credentials (or fall back to global)
        const { apiKey, apiSecret } = this.getCredentialsForMarket(market);

        if (!apiKey || !apiSecret) {
            throw new BadRequestException(
                `Lalamove API credentials not configured for market: ${market}. ` +
                `Please set LALAMOVE_API_KEY_${market.toUpperCase()} and LALAMOVE_API_SECRET_${market.toUpperCase()} ` +
                `in environment variables, or set global LALAMOVE_API_KEY and LALAMOVE_API_SECRET as fallback.`
            );
        }

        const timestamp = Date.now().toString();
        const bodyString = body ? JSON.stringify(body) : '';
        const signature = this.generateSignature(
            timestamp,
            method,
            path,
            bodyString,
            apiSecret,
        );

        const token = `${apiKey}:${timestamp}:${signature}`;
        const baseUrl = environment === 'PRODUCTION' ? this.productionUrl : this.sandboxUrl;

        const response = await fetch(`${baseUrl}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `hmac ${token}`,
                'Market': market,
                'Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error: any = await response.json();
            this.logger.error(`Lalamove API error: ${JSON.stringify(error)}`);
            throw new BadRequestException(error?.message || 'Lalamove API request failed');
        }

        return response.json();
    }

    /**
     * Get delivery quotation from Lalamove
     */
    async getQuotation(warehouseId: string, orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                customer: true,
                warehouse: true,
                destinationWarehouse: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const config = await this.prisma.lalamoveConfig.findUnique({
            where: { warehouseId },
        });

        // if (!config) { ... } -> Removed strict check to allow env var fallback

        // Calculate total weight
        const totalWeight = order.items.reduce((sum, item) => {
            const weight = item.product.weight || 0;
            return sum + (weight * item.quantity);
        }, 0);

        // Determine service type based on weight
        let serviceType = config?.defaultServiceType || 'MOTORCYCLE';
        if (totalWeight > 500) {
            serviceType = 'LORRY';
        } else if (totalWeight > 100) {
            serviceType = 'VAN';
        } else if (totalWeight > 20) {
            serviceType = 'SEDAN';
        }


        // Validate customer address data for sales orders
        if (order.type === 'SALES') {
            if (!order.customer) {
                throw new BadRequestException('Sales order must have a customer for Lalamove delivery');
            }
            if (!order.customer.address || !order.customer.latitude || !order.customer.longitude) {
                throw new BadRequestException(
                    'Customer must have complete address with latitude and longitude for Lalamove delivery. ' +
                    'Please update customer information with a valid address.'
                );
            }
        }

        // Validate destination warehouse for transfer orders
        if (order.type === 'TRANSFER') {
            if (!order.destinationWarehouse) {
                throw new BadRequestException('Transfer order must have a destination warehouse for Lalamove delivery');
            }
            if (!order.destinationWarehouse.location || !order.destinationWarehouse.address) {
                throw new BadRequestException(
                    'Destination warehouse must have complete address with coordinates for Lalamove delivery. ' +
                    'Please update warehouse information.'
                );
            }
        }

        // Determine destination stop based on order type
        let destinationStop;
        if (order.type === 'TRANSFER') {
            // For transfer orders, use destination warehouse
            const destCoordinates = JSON.parse(order.destinationWarehouse.location);
            destinationStop = {
                coordinates: {
                    lat: destCoordinates.lat.toString(),
                    lng: destCoordinates.lng.toString()
                },
                address: order.destinationWarehouse.address || order.destinationWarehouse.name,
            };
        } else {
            // For sales orders, use customer address
            destinationStop = {
                coordinates: {
                    lat: order.customer.latitude.toString(),
                    lng: order.customer.longitude.toString()
                },
                address: order.customer.address,
            };
        }

        // Determine language based on market
        const market = config?.market || 'ID';
        const languageMap: Record<string, string> = {
            'ID': 'en_ID',
            'SG': 'en_SG',
            'TH': 'th_TH',
            'PH': 'en_PH',
            'VN': 'vi_VN',
        };
        const language = languageMap[market] || 'en_ID';

        // Build quotation request
        const quotationRequest: QuotationRequest = {
            serviceType,
            language,
            stops: [
                {
                    coordinates: {
                        lat: order.warehouse.latitude?.toString() || '0',
                        lng: order.warehouse.longitude?.toString() || '0',
                    },
                    address: order.warehouse.address || order.warehouse.name,
                },
                destinationStop,
            ],
            item: {
                quantity: order.items.length.toString(),
                weight: totalWeight > 0 ? totalWeight.toFixed(2) : '1',
                categories: ['FOOD_DELIVERY'], // TODO: Make configurable
            },
            isRouteOptimized: false,
        };

        const response: QuotationResponse = await this.makeRequest(
            warehouseId,
            'POST',
            '/v3/quotations',
            { data: quotationRequest },
        );

        return {
            quotationId: response.data.quotationId,
            price: response.data.priceBreakdown?.total,
            currency: response.data.priceBreakdown?.currency,
            serviceType,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min validity
            stops: response.data.stops, // Include stops with stopIds for booking
        };
    }

    /**
     * Place Lalamove order
     */
    async placeOrder(warehouseId: string, orderId: string, quotationId: string, stops?: any[]) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                customer: true,
                warehouse: true,
                destinationWarehouse: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const config = await this.prisma.lalamoveConfig.findUnique({
            where: { warehouseId },
        });

        // Validate warehouse phone
        if (!order.warehouse.phone) {
            throw new BadRequestException(
                'Warehouse phone number is required for Lalamove delivery. ' +
                'Please update warehouse information with a valid phone number.'
            );
        }

        // Use provided stops or fetch quotation for stop IDs
        let quotationStops = stops;
        if (!quotationStops || quotationStops.length < 2) {
            // Fallback: get fresh quotation if stops not provided
            const quotation = await this.getQuotation(warehouseId, orderId);
            quotationStops = quotation.stops;

            if (!quotationStops || quotationStops.length < 2) {
                throw new BadRequestException('Invalid quotation: missing stop information');
            }
        }

        // Build order request with recipient based on order type
        let recipientInfo;
        if (order.type === 'TRANSFER') {
            // For transfer orders, recipient is the destination warehouse
            if (!order.destinationWarehouse?.phone) {
                throw new BadRequestException(
                    'Destination warehouse phone number is required for Lalamove delivery'
                );
            }

            recipientInfo = {
                stopId: quotationStops[1].stopId, // Second stop is destination
                name: order.destinationWarehouse.name,
                phone: order.destinationWarehouse.phone,
                remarks: `Transfer Order #${order.id}`,
            };
        } else {
            // For sales orders, recipient is the customer
            if (!order.customer?.phone) {
                throw new BadRequestException(
                    'Customer phone number is required for Lalamove delivery. ' +
                    'Please update customer information with a valid phone number.'
                );
            }

            recipientInfo = {
                stopId: quotationStops[1].stopId, // Second stop is destination
                name: order.customer.name,
                phone: order.customer.phone,
                remarks: `Order #${order.id}`,
            };
        }

        // Build order request
        const orderRequest = {
            data: {
                quotationId,
                sender: {
                    stopId: quotationStops[0].stopId, // First stop is pickup
                    name: order.warehouse.name,
                    phone: order.warehouse.phone,
                },
                recipients: [recipientInfo],
                isPODEnabled: true,
                metadata: {
                    orderId: order.id,
                    orderNumber: order.id,
                },
            },
        };

        const response: OrderResponse = await this.makeRequest(
            warehouseId,
            'POST',
            '/v3/orders',
            orderRequest,
        );

        // Save Lalamove order to database
        const lalamoveOrder = await this.prisma.lalamoveOrder.create({
            data: {
                orderId: order.id,
                quotationId,
                lalamoveOrderId: response.data.orderId,
                shareLink: response.data.shareLink,
                serviceType: response.data.stops?.[0]?.coordinates ? 'MOTORCYCLE' : 'MOTORCYCLE', // Get from response
                market: config?.market || 'TH',
                status: response.data.status || 'ASSIGNING_DRIVER',
                quotedPrice: parseFloat(response.data.priceBreakdown?.total || '0'),
                currency: response.data.priceBreakdown?.currency,
                priceBreakdown: JSON.stringify(response.data.priceBreakdown),
                stops: JSON.stringify(response.data.stops),
            },
        });

        // Update order shipping cost
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                shippingCost: lalamoveOrder.quotedPrice || 0,
            },
        });

        return lalamoveOrder;
    }

    /**
     * Get order status from Lalamove
     */
    async getOrderStatus(lalamoveOrderId: string) {
        const lalamoveOrder = await this.prisma.lalamoveOrder.findUnique({
            where: { lalamoveOrderId },
            include: { order: { include: { warehouse: true } } },
        });

        if (!lalamoveOrder) {
            throw new NotFoundException('Lalamove order not found');
        }

        const response: OrderStatusResponse = await this.makeRequest(
            lalamoveOrder.order.warehouseId,
            'GET',
            `/v3/orders/${lalamoveOrderId}`,
        );

        // Update database with latest status
        await this.prisma.lalamoveOrder.update({
            where: { lalamoveOrderId },
            data: {
                status: response.data.status,
                driverId: response.data.driverId,
                finalPrice: response.data.priceBreakdown?.total ? parseFloat(response.data.priceBreakdown.total) : undefined,
                distance: response.data.distance?.value ? parseFloat(response.data.distance.value) : undefined,
                distanceUnit: response.data.distance?.unit,
                stops: JSON.stringify(response.data.stops),
            },
        });

        return response.data;
    }

    /**
     * Cancel Lalamove order
     */
    async cancelOrder(lalamoveOrderId: string) {
        const lalamoveOrder = await this.prisma.lalamoveOrder.findUnique({
            where: { lalamoveOrderId },
            include: { order: { include: { warehouse: true } } },
        });

        if (!lalamoveOrder) {
            throw new NotFoundException('Lalamove order not found');
        }

        await this.makeRequest(
            lalamoveOrder.order.warehouseId,
            'PUT',
            `/v3/orders/${lalamoveOrderId}/cancel`,
        );

        await this.prisma.lalamoveOrder.update({
            where: { lalamoveOrderId },
            data: { status: 'CANCELLED' },
        });

        return { message: 'Order cancelled successfully' };
    }

    /**
     * Handle webhook from Lalamove
     */
    async handleWebhook(payload: any) {
        this.logger.log(`Received webhook: ${JSON.stringify(payload)}`);

        const { orderId, status, driverId, priceBreakdown } = payload;

        if (!orderId) {
            this.logger.warn('Webhook missing orderId');
            return;
        }

        const lalamoveOrder = await this.prisma.lalamoveOrder.findUnique({
            where: { lalamoveOrderId: orderId },
        });

        if (!lalamoveOrder) {
            this.logger.warn(`Lalamove order ${orderId} not found in database`);
            return;
        }

        // Update order status
        await this.prisma.lalamoveOrder.update({
            where: { lalamoveOrderId: orderId },
            data: {
                status: status || lalamoveOrder.status,
                driverId: driverId || lalamoveOrder.driverId,
                finalPrice: priceBreakdown?.total ? parseFloat(priceBreakdown.total) : lalamoveOrder.finalPrice,
            },
        });

        this.logger.log(`Updated Lalamove order ${orderId} with webhook data`);
    }
}
