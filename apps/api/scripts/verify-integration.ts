
import { IntegrationService } from '../src/integration/integration.service';

async function main() {
    console.log('--- Starting Integration Verification (Direct) ---');

    // IntegrationService deps: PrismaService, InventoryService
    // Since sync methods are mock and don't use deps, we can pass null/mock
    const mockPrisma: any = {};
    const mockInventory: any = {};

    const service = new IntegrationService(mockPrisma, mockInventory);

    try {
        // 1. Sync Sales Channel
        console.log('Syncing Sales Channel (Shopee)...');
        const salesResult = await service.syncSalesChannel('Shopee');
        console.log('Sales Sync Result:', salesResult);

        if (salesResult.status !== 'SUCCESS' || salesResult.syncedOrders !== 2) {
            throw new Error('Sales Sync Failed verification');
        }

        // 2. Sync Logistics
        console.log('\nSyncing Logistics (JNE)...');
        const logisticsResult = await service.syncLogistics('JNE');
        console.log('Logistics Sync Result:', logisticsResult);

        if (logisticsResult.status !== 'SUCCESS' || logisticsResult.updates !== 2) {
            throw new Error('Logistics Sync Failed verification');
        }

        console.log('\nIntegration Verification Successful!');

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
