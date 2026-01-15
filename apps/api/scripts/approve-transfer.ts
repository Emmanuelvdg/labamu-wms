
import { NestFactory } from '@nestjs/core';
import { FulfillmentModule } from '../src/fulfillment/fulfillment.module';
import { FulfillmentService } from '../src/fulfillment/fulfillment.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
    console.log('--- Approving Transfer Order ---');

    console.log('Initializing Application Context...');
    const app = await NestFactory.createApplicationContext(FulfillmentModule);
    const service = app.get(FulfillmentService);
    const prisma = app.get(PrismaService);

    try {
        // Find the pending transfer
        const transfer = await prisma.order.findFirst({
            where: { type: 'TRANSFER', status: 'PENDING' },
            orderBy: { createdAt: 'desc' }
        });

        if (!transfer) {
            console.log('No PENDING transfer found.');
            return;
        }

        console.log(`Found Pending Transfer: ${transfer.id}`);

        const adminUser = await prisma.user.findFirst({ where: { email: 'admin@labamu.co.id' } });
        if (!adminUser) throw new Error('Admin user not found');
        const userId = adminUser.id;

        console.log('Approving Transfer...');
        // Note: TransferOrder table is separate? 
        // fulfillment.service.ts uses prisma.transferOrder.update
        // BUT schema says Order has type='TRANSFER'.
        // Wait, did I check TransferOrder model?
        // Step 518 showed Order model.
        // Step 514 (FulfillmentService) used `this.prisma.transferOrder.update`.
        // If they are DIFFERENT tables, then `createTransferRequest` creating an `Order`
        // but `approveTransfer` updating `TransferOrder` would fail if ID doesn't exist in TransferOrder.

        // CRITICAL CHECK: Does TransferOrder exist?
        // Schema view in Step 352 showed `transferOrders TransferOrder[]` on User?
        // And Step 78 logic used `transferOrder`.

        // Let's try to approve using the ID. If it fails, we know there's a mismatch.
        // But `createTransferRequest` creates an `Order`.
        // If `TransferOrder` is a different table, `approve` will fail.

        // Let's assume the service handles it or valid logic exists.
        // Actually, if `create` returned an `Order`, and `approve` takes that ID...
        // Does `Order` map to `TransferOrder`?
        // Maybe Prisma Polymorphism or just bad naming?
        // Or maybe `createTransferRequest` ignores `TransferOrder` table and just makes an Order?
        // And `approveTransfer` tries to update `TransferOrder`?
        // If so, `approveTransfer` is BROKEN.

        // I will run this script to find out.

        const approved = await service.approveTransfer(transfer.id, userId);
        console.log(`Transfer Approved: ${approved.id} (Status: ${approved.status})`);

    } catch (error) {
        console.error('Approval Failed:', error);
    } finally {
        await app.close();
    }
}

main().catch(console.error);
