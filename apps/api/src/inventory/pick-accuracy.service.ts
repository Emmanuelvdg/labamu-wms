import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PickAccuracyService {
    private readonly logger = new Logger(PickAccuracyService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Calculate pick accuracy metrics for a warehouse over a given period
     */
    async getPickAccuracyMetrics(warehouseId: string, periodDays = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Fetch all completed or exception tasks in the period
        const tasks = await this.prisma.pickingTask.findMany({
            where: {
                session: { warehouseId },
                updatedAt: { gte: startDate },
                status: { in: ['COMPLETED', 'EXCEPTION'] }
            }
        });

        const totalTasks = tasks.length;
        if (totalTasks === 0) {
            return {
                accuracyPercentage: 100,
                totalTasks: 0,
                perfectPicks: 0,
                exceptions: 0,
                shortPicks: 0
            };
        }

        let perfectPicks = 0;
        let exceptions = 0;
        let shortPicks = 0;

        for (const task of tasks) {
            if (task.status === 'EXCEPTION' || task.exceptionReason) {
                exceptions++;
            } else if (task.pickedQuantity < task.quantity) {
                shortPicks++;
            } else {
                perfectPicks++;
            }
        }

        // Accuracy is perfect picks / total tasks
        const accuracyPercentage = (perfectPicks / totalTasks) * 100;

        return {
            accuracyPercentage: parseFloat(accuracyPercentage.toFixed(2)),
            totalTasks,
            perfectPicks,
            exceptions,
            shortPicks
        };
    }
}
