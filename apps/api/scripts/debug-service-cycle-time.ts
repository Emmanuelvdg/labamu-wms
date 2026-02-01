
import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from '../src/reporting/reporting.service';
import { PrismaService } from '../src/prisma.service';

async function debugCycleTime() {
    const module: TestingModule = await Test.createTestingModule({
        providers: [ReportingService, PrismaService],
    }).compile();

    const service = module.get<ReportingService>(ReportingService);
    const prisma = module.get<PrismaService>(PrismaService);

    // Connect prisma manually if needed, or rely on service
    // But PrismaService has onModuleInit. Nest Test module might not trigger it automatically if not initialized.
    // We can just use prisma client logic inside service.

    console.log('Testing getCycleTimeTrend for last 30 days...');
    try {
        const result = await service.getCycleTimeTrend({ period: '30d' });
        console.log(`Result count: ${result.length}`);

        const nonZero = result.filter(r => r.orderCount > 0);
        console.log(`Non-zero entries: ${nonZero.length}`);

        if (nonZero.length > 0) {
            console.log('Sample non-zero:', nonZero[0]);
        } else {
            console.log('ALL ENTRIES ARE ZERO/EMPTY');

            // Debugging the logic inside script:
            console.log('--- DEBUGGING LOGIC ---');
            const { startDate, endDate } = (service as any).parseDateRange({ period: '30d' });
            console.log('Start:', startDate.toISOString());
            console.log('End:', endDate.toISOString());

            const orders = await prisma.order.findMany({
                where: {
                    status: 'SHIPPED',
                    updatedAt: { gte: startDate, lte: endDate }
                },
                select: { createdAt: true, updatedAt: true }
            });
            console.log(`Orders found in range: ${orders.length}`);

            if (orders.length > 0) {
                const sample = orders[0];
                const key = new Date(sample.updatedAt).toISOString().split('T')[0];
                console.log(`Sample Order Date Key: ${key}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debugCycleTime();
