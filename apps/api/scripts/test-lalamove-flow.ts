
// Ensure module scope
export { };

const { PrismaClient } = require('@labamu/database');
const dotenv = require('dotenv');
const path = require('path');
const cryptoLib = require('crypto');

// Polyfill fetch if needed
if (typeof fetch === 'undefined') {
    try { global.fetch = require('node-fetch'); } catch (e) { console.warn('node-fetch not found, fetch might fail'); }
}

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    const defaultWarehouseId = 'ce2a9f2d-5d92-40c4-82e4-2accbcc0a07c';
    const defaultOrderId = 'd4c58f9d-b4f0-48c6-ba00-418e1ecc3f51';

    const warehouseId = process.argv[2] || defaultWarehouseId;
    const orderId = process.argv[3] || defaultOrderId;

    console.log(`Testing Lalamove Flow for Order: ${orderId} from Warehouse: ${warehouseId}`);

    const prisma = new PrismaClient();

    // 1. Get Config
    const config = await prisma.lalamoveConfig.findUnique({
        where: { warehouseId },
    });

    if (!config) throw new Error('No Lalamove Config found for warehouse');

    const market = config.market;
    // Keys from ENV (safer and matches service logic)
    const envKeyName = `LALAMOVE_API_KEY_${market}`;
    const envSecretName = `LALAMOVE_API_SECRET_${market}`;

    const finalApiKey = process.env[envKeyName] || process.env.LALAMOVE_API_KEY;
    const finalApiSecret = process.env[envSecretName] || process.env.LALAMOVE_API_SECRET;

    if (!finalApiKey || !finalApiSecret) throw new Error(`Missing keys for market ${market}`);

    const sandboxUrl = 'https://rest.sandbox.lalamove.com';
    const baseUrl = sandboxUrl;

    // Helper: Signature
    const generateSignature = (timestamp: string, method: string, path: string, body: string, secret: string) => {
        const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
        return cryptoLib.createHmac('sha256', secret).update(rawSignature).digest('hex');
    };

    const makeRequest = async (method: string, apiPath: string, body: any): Promise<any> => {
        const timestamp = Date.now().toString();
        const bodyString = body ? JSON.stringify(body) : '';
        const signature = generateSignature(timestamp, method, apiPath, bodyString, finalApiSecret);
        const token = `${finalApiKey}:${timestamp}:${signature}`;

        console.log(`Request: ${method} ${baseUrl}${apiPath}`);

        const res = await fetch(`${baseUrl}${apiPath}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `hmac ${token}`,
                'Market': market,
                'Request-ID': `TEST-${timestamp}`,
            },
            body: body ? bodyString : undefined
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`API Error: ${res.status} ${txt}`);
        }
        return res.json();
    };

    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: true } },
                customer: true,
                warehouse: true
            }
        });

        if (!order) throw new Error('Order not found');

        // 1. Get Quotation
        console.log('\n--- 1. Getting Quotation ---');

        const quotationRequest = {
            serviceType: 'MOTORCYCLE',
            language: 'en_SG',
            stops: [
                {
                    coordinates: {
                        lat: order.warehouse.latitude?.toString() ?? '0',
                        lng: order.warehouse.longitude?.toString() ?? '0',
                    },
                    address: order.warehouse.address || order.warehouse.name,
                },
                {
                    coordinates: {
                        lat: order.customer.latitude?.toString() ?? '0',
                        lng: order.customer.longitude?.toString() ?? '0',
                    },
                    address: order.customer.address || order.customer.name,
                }
            ],
            item: {
                quantity: order.items.length.toString(),
                weight: '1',
                categories: ['FOOD_DELIVERY'],
            },
            isRouteOptimized: false,
        };

        const quoteRes = await makeRequest('POST', '/v3/quotations', { data: quotationRequest });
        console.log('Quote Response:', JSON.stringify(quoteRes, null, 2));

        const quotationId = quoteRes.data.quotationId;
        const stopId = quoteRes.data.stops[0].stopId;
        const toStopId = quoteRes.data.stops[1].stopId;

        // 2. Place Order
        console.log(`\n--- 2. Placing Order (Quote: ${quotationId}) ---`);

        const orderRequest = {
            data: {
                quotationId,
                sender: {
                    stopId: stopId,
                    name: order.warehouse.name,
                    phone: order.warehouse.phone || '+6599999999',
                },
                recipients: [
                    {
                        stopId: toStopId,
                        name: order.customer.name,
                        phone: order.customer.phone || '+6588888888',
                    }
                ],
                isPODEnabled: true,
                metadata: { orderId: order.id }
            }
        };

        const orderRes = await makeRequest('POST', '/v3/orders', orderRequest);
        console.log('Order Response:', JSON.stringify(orderRes, null, 2));

        const lalamoveOrderId = orderRes.data.orderId;
        console.log(`\nPLACED ORDER: ${lalamoveOrderId}`);

        // 3. CancelOrder
        // We do not cancel it immediately to allow manual inspection in Lalamove dashboard if needed,
        // but for test cleanliness we should.
        // Actually, let's keep it unless previous run failed.
        // The script had cancel logic.

        console.log(`\n--- 3. Cancelling Order ---`);
        const cancelRes = await makeRequest('DELETE', `/v3/orders/${lalamoveOrderId}`, {});
        console.log('Cancel Response:', JSON.stringify(cancelRes, null, 2));

        console.log('\nTEST SUCCESSFUL');

    } catch (e) {
        console.error('TEST FAILED:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
