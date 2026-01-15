
import { NestFactory } from '@nestjs/core';
import { FulfillmentModule } from '../src/fulfillment/fulfillment.module';
import { FulfillmentService } from '../src/fulfillment/fulfillment.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
    console.log('--- Starting IWT Verification (NestJS Context) ---');

    console.log('Initializing Application Context...');
    const app = await NestFactory.createApplicationContext(FulfillmentModule);
    const service = app.get(FulfillmentService);
    const prisma = app.get(PrismaService);

    try {
        // 1. Get Data
        const e2eProd = await prisma.product.findFirst({ where: { sku: 'E2E-PROD-NEW' } });
        if (!e2eProd) throw new Error('E2E Product not found');

        const e2eWh = await prisma.warehouse.findFirst({ where: { name: 'E2E Warehouse' } });
        const mainWh = await prisma.warehouse.findFirst({ where: { name: 'Main Warehouse' } });
        if (!e2eWh || !mainWh) throw new Error('Warehouses not found');

        const adminUser = await prisma.user.findFirst({ where: { email: 'admin@labamu.co.id' } });
        if (!adminUser) throw new Error('Admin user not found');
        const userId = adminUser.id;

        console.log(`Product: ${e2eProd.id}`);
        console.log(`Source (E2E): ${e2eWh.id}`);
        console.log(`Dest (Main): ${mainWh.id}`);
        console.log(`Initiator: ${userId}`);

        // 2. Create Transfer Request
        console.log('Creating Transfer Request...');
        const transferPayload = {
            sourceWarehouseId: e2eWh.id,
            destinationWarehouseId: mainWh.id,
            items: [{ productId: e2eProd.id, quantity: 10 }],
            initiatorId: userId
        };

        const transfer = await service.createTransferRequest(transferPayload);
        console.log(`Transfer Created: ${transfer.id} (Status: ${transfer.status})`);

        if (transfer.status !== 'PENDING') throw new Error(`Unexpected status: ${transfer.status}`);

        // 3. Approve Transfer
        console.log('Approving Transfer...');
        const approvedTransfer = await service.approveTransfer(transfer.id, userId);
        console.log(`Transfer Approved: ${approvedTransfer.id} (Status: ${approvedTransfer.status})`);

        if (approvedTransfer.status !== 'APPROVED') throw new Error(`Failed to approve transfer`);

        console.log('IWT Flow Verification Successful!');
    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

main().catch(console.error);
