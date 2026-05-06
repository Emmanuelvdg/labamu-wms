import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PackingService {
    private readonly logger = new Logger(PackingService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Create a packing session for an order.
     * Order must be in PACKING status (just completed picking).
     */
    async createSession(orderId: string, workerId?: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: true } },
                packingSession: true,
            },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.status !== 'PACKING') {
            throw new BadRequestException(`Order must be in PACKING status to start packing. Current: ${order.status}`);
        }
        if (order.packingSession) {
            // Return existing session if one already exists
            return this.getSession(order.packingSession.id);
        }

        const session = await this.prisma.packingSession.create({
            data: {
                orderId,
                workerId,
                status: 'IN_PROGRESS',
            },
            include: {
                order: { include: { items: { include: { product: true } }, customer: true } },
                parcels: { include: { items: { include: { product: true } } } },
            },
        });

        this.logger.log(`Packing session created for order ${orderId}: ${session.id}`);
        return session;
    }

    /**
     * Get session details with all parcels and items.
     */
    async getSession(sessionId: string) {
        const session = await this.prisma.packingSession.findUnique({
            where: { id: sessionId },
            include: {
                order: {
                    include: {
                        items: { include: { product: true } },
                        customer: true,
                        warehouse: true,
                    },
                },
                parcels: {
                    include: {
                        items: { include: { product: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!session) throw new NotFoundException('Packing session not found');

        // Calculate packing progress
        const orderItems = session.order.items;
        const packedItems = session.parcels.flatMap(p => p.items);

        const progress = orderItems.map(oi => {
            const packedQty = packedItems
                .filter(pi => pi.productId === oi.productId)
                .reduce((sum, pi) => sum + pi.quantity, 0);
            return {
                productId: oi.productId,
                productName: oi.product.name,
                productSku: oi.product.sku,
                orderedQty: oi.quantity,
                packedQty,
                remaining: oi.quantity - packedQty,
            };
        });

        return {
            ...session,
            progress,
            allItemsPacked: progress.every(p => p.remaining === 0),
        };
    }

    /**
     * Get session by order ID.
     */
    async getSessionByOrder(orderId: string) {
        const session = await this.prisma.packingSession.findUnique({
            where: { orderId },
        });
        if (!session) return null;
        return this.getSession(session.id);
    }

    /**
     * Scan/verify an item barcode against the order.
     * Returns the matched product and remaining quantity to pack.
     */
    async scanItem(sessionId: string, barcode: string) {
        const session = await this.getSession(sessionId);

        // Look up product by SKU or ID (barcode could be either)
        const product = await this.prisma.product.findFirst({
            where: {
                OR: [
                    { sku: barcode },
                    { id: barcode },
                ],
            },
        });

        if (!product) {
            throw new BadRequestException(`No product found for barcode: ${barcode}`);
        }

        // Check if this product is in the order
        const orderItem = session.order.items.find(oi => oi.productId === product.id);
        if (!orderItem) {
            throw new BadRequestException(`Product "${product.name}" (${product.sku}) is not in this order`);
        }

        // Check remaining quantity
        const progressItem = session.progress.find(p => p.productId === product.id);
        if (!progressItem || progressItem.remaining <= 0) {
            throw new BadRequestException(`Product "${product.name}" is already fully packed`);
        }

        return {
            product,
            orderedQty: progressItem.orderedQty,
            packedQty: progressItem.packedQty,
            remaining: progressItem.remaining,
            verified: true,
        };
    }

    /**
     * Create a parcel (package) and assign items to it.
     */
    async createParcel(
        sessionId: string,
        data: {
            weight?: number;
            length?: number;
            width?: number;
            height?: number;
            trackingNumber?: string;
            items: { productId: string; quantity: number }[];
        },
    ) {
        const session = await this.getSession(sessionId);

        if (session.status === 'COMPLETED') {
            throw new BadRequestException('Packing session is already completed');
        }

        // Validate items don't exceed remaining quantities
        for (const item of data.items) {
            const progressItem = session.progress.find(p => p.productId === item.productId);
            if (!progressItem) {
                throw new BadRequestException(`Product ${item.productId} is not in this order`);
            }
            if (item.quantity > progressItem.remaining) {
                throw new BadRequestException(
                    `Cannot pack ${item.quantity} of "${progressItem.productName}" – only ${progressItem.remaining} remaining`,
                );
            }
        }

        const parcel = await this.prisma.packingParcel.create({
            data: {
                packingSessionId: sessionId,
                weight: data.weight,
                length: data.length,
                width: data.width,
                height: data.height,
                trackingNumber: data.trackingNumber,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                },
            },
            include: {
                items: { include: { product: true } },
            },
        });

        this.logger.log(`Parcel created in session ${sessionId}: ${parcel.id} with ${data.items.length} items`);
        return parcel;
    }

    /**
     * Remove a parcel (e.g., if packed incorrectly).
     */
    async removeParcel(parcelId: string) {
        // Delete items first, then parcel
        await this.prisma.packingParcelItem.deleteMany({ where: { parcelId } });
        await this.prisma.packingParcel.delete({ where: { id: parcelId } });
        return { success: true };
    }

    /**
     * Complete packing session. All items must be packed.
     * Transitions order from PACKING → PACKED.
     */
    async completeSession(sessionId: string) {
        const session = await this.getSession(sessionId);

        if (session.status === 'COMPLETED') {
            throw new BadRequestException('Packing session is already completed');
        }

        // Verify all items are packed
        const unpacked = session.progress.filter(p => p.remaining > 0);
        if (unpacked.length > 0) {
            const details = unpacked.map(p => `${p.productName}: ${p.remaining} remaining`).join(', ');
            throw new BadRequestException(`Cannot complete packing – items still unpacked: ${details}`);
        }

        // Update session status
        await this.prisma.packingSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });

        // Transition order to PACKED
        await this.prisma.order.update({
            where: { id: session.orderId },
            data: { status: 'PACKED' },
        });

        this.logger.log(`Packing completed for order ${session.orderId}, session ${sessionId}`);

        return this.getSession(sessionId);
    }

    async listSessions(orderId?: string) {
        const where: any = {};
        if (orderId) where.orderId = orderId;
        return this.prisma.packingSession.findMany({
            where,
            include: {
                order: { include: { customer: true } },
                parcels: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get all orders awaiting packing (in PACKING status).
     */
    async getPackingQueue(warehouseId?: string) {
        const where: any = { status: 'PACKING' };
        if (warehouseId) where.warehouseId = warehouseId;

        const orders = await this.prisma.order.findMany({
            where,
            include: {
                items: { include: { product: true } },
                customer: true,
                packingSession: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        return orders.map(order => ({
            ...order,
            hasSession: !!order.packingSession,
            sessionStatus: order.packingSession?.status || null,
        }));
    }
}
