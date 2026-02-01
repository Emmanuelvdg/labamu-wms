export { };

const { PrismaClient } = require('@labamu/database');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') }); // Look in apps/api/.env

const prisma = new PrismaClient();

async function main() {
    console.log('Setting up Lalamove Test Environment (Singapore Market)...');

    // 1. Setup Warehouse with valid SG coordinates
    // Location: Marina Bay Sands
    const warehouseData = {
        name: 'Lalamove SG Warehouse',
        shortName: 'DCSG',
        type: 'DISTRIBUTION_CENTER',
        address: '10 Bayfront Ave, Singapore 018956',
        city: 'Singapore',
        country: 'Singapore',
        postalCode: '018956',
        latitude: 1.2847,
        longitude: 103.8610,
        gridEnabled: true,
        gridSize: 1.0,
    };

    let warehouse = await prisma.warehouse.findFirst({
        where: { name: warehouseData.name },
    });

    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: warehouseData,
        });
        console.log(`Created Warehouse: ${warehouse.name} (${warehouse.id})`);
    } else {
        // Update coordinates if they exist
        warehouse = await prisma.warehouse.update({
            where: { id: warehouse.id },
            data: warehouseData
        });
        console.log(`Found Warehouse: ${warehouse.name} (${warehouse.id})`);
    }

    // 2. Setup Lalamove Config
    // Ensure we have API keys
    const apiKey = process.env.LALAMOVE_API_KEY_SG || process.env.LALAMOVE_API_KEY;
    const apiSecret = process.env.LALAMOVE_API_SECRET_SG || process.env.LALAMOVE_API_SECRET;

    if (!apiKey || !apiSecret) {
        console.error('ERROR: Missing Lalamove API Keys.');
        console.error('Please set LALAMOVE_API_KEY_SG/SECRET_SG or LALAMOVE_API_KEY/SECRET in .env');
        // We proceed anyway to setup the DB config, but warn the user
    }

    const existingConfig = await prisma.lalamoveConfig.findUnique({
        where: { warehouseId: warehouse.id },
    });

    if (existingConfig) {
        await prisma.lalamoveConfig.update({
            where: { id: existingConfig.id },
            data: {
                market: 'SG',
                environment: 'SANDBOX',
                apiKey: apiKey || 'PLACEHOLDER',
                apiSecret: apiSecret || 'PLACEHOLDER',
            }
        });
        console.log('Updated Lalamove Config.');
    } else {
        await prisma.lalamoveConfig.create({
            data: {
                warehouseId: warehouse.id,
                market: 'SG',
                environment: 'SANDBOX',
                apiKey: apiKey || 'PLACEHOLDER',
                apiSecret: apiSecret || 'PLACEHOLDER',
                defaultServiceType: 'MOTORCYCLE',
            }
        });
        console.log('Created Lalamove Config.');
    }

    // 3. Setup Customer (Destination)
    // Location: Changi Airport
    const customerData = {
        name: 'Lalamove Test Customer SG',
        address: 'Airport Blvd., Singapore',
        city: 'Singapore',
        country: 'Singapore',
        postalCode: '819666',
        latitude: 1.3644,
        longitude: 103.9915,
        phone: '+6512345678',
    };

    let customer = await prisma.customer.findFirst({
        where: { name: customerData.name }
    });

    if (!customer) {
        customer = await prisma.customer.create({ data: customerData });
        console.log(`Created Customer: ${customer.name}`);
    } else {
        // Update coords
        customer = await prisma.customer.update({
            where: { id: customer.id },
            data: customerData
        });
        console.log(`Found Customer: ${customer.name}`);
    }

    // 4. Ensure Product exists
    const sku = 'PROD-SG-001';
    let product = await prisma.product.findUnique({ where: { sku } });
    if (!product) {
        product = await prisma.product.create({
            data: {
                sku,
                name: 'SG Test Item',
                category: 'General',
                weight: 1.5, // kg
                price: 100,
                description: 'Item for delivery test',
            }
        });
        console.log(`Created Product: ${sku}`);
    }

    // 5. Create Order
    const order = await prisma.order.create({
        data: {
            warehouseId: warehouse.id,
            customerId: customer.id,
            status: 'PENDING',
            fulfillmentStatus: 'UNALLOCATED',
            priority: 'NORMAL',
            type: 'SALES',
            shippingCarrier: 'LALAMOVE',
            items: {
                create: [
                    {
                        productId: product.id,
                        quantity: 2,
                    }
                ]
            }
        }
    });

    console.log(`Created Order: ${order.id}`);
    console.log(`\n=== SETUP COMPLETE ===`);
    console.log(`Warehouse ID: ${warehouse.id}`);
    console.log(`Order ID:     ${order.id}`);
    console.log(`Run the test script with these IDs.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
