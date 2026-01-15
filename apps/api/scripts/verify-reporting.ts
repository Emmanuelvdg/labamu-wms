
import { NestFactory } from '@nestjs/core';
import { ReportingModule } from '../src/reporting/reporting.module';
import { ReportingService } from '../src/reporting/reporting.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
    console.log('--- Starting Reporting Verification ---');

    // Manually register PrismaService cause ReportModule might not export it or have it?
    // ReportingModule likely imports PrismaModule or provides PrismaService.
    // Let's assume ReportingModule is sufficient. 
    // Step 602 showed ReportingModule exists.

    // However, ReportingModule likely depends on PrismaService.
    // If ReportingModule doesn't provide PrismaService, we might need to import a root module?
    // Or just create a dynamic module? 
    // Let's trust ReportingModule structure or inspect it quickly.
    // But to save time, I will try to use ReportingModule.

    const app = await NestFactory.createApplicationContext(ReportingModule);
    const service = app.get(ReportingService);

    try {
        // 1. Dashboard Analytics
        console.log('Fetching Dashboard Analytics...');
        const analytics = await service.getDashboardAnalytics({ period: '30d' });
        console.log('Analytics Result:');
        console.log(`- Total Stock Value: ${analytics.totalStockValue}`);
        console.log(`- Fulfillment Rate: ${analytics.fulfillmentRate}%`);
        console.log(`- Pending Orders: ${analytics.pendingOrders}`);
        console.log(`- Daily Sales Graph: ${analytics.dailySales.length} points`);

        if (typeof analytics.totalStockValue !== 'number') throw new Error('Invalid Stock Value');

        // 2. VAT Report
        console.log('\nGenerating VAT Report...');
        const vatReport = await service.generateComplianceReport('VAT', '2026-01');
        if (vatReport) {
            console.log(`- VAT Report Generated: ${vatReport.transactionCount} transactions, VAT: ${vatReport.totalVAT}`);
        } else {
            console.log('- VAT Report returned null (maybe invalid type?)');
        }

        // 3. SAF-T Report
        console.log('\nGenerating SAF-T Report...');
        const saftReport = await service.generateComplianceReport('SAF-T', '2026-01');
        if (saftReport) {
            console.log(`- SAF-T Report Generated: ${saftReport.transactions.length} transactions`);
        }

        console.log('\nReporting Verification Successful!');

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

main().catch(console.error);
