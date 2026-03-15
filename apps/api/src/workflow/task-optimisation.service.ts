import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TaskOptimisationService {
    private readonly logger = new Logger(TaskOptimisationService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Match tasks to workers by proximity, skills, workload.
     * For now, this is a simplified stub that assigns the first available task to the worker.
     */
    async assignTasks(taskIds: string[], availableWorkerIds: string[]) {
        this.logger.log(`Assigning ${taskIds.length} tasks to ${availableWorkerIds.length} workers...`);
        // Implementation would distribute tasks based on worker location/skills.
        return { success: true, assignedCount: Math.min(taskIds.length, availableWorkerIds.length) };
    }

    /**
     * Recalculate pick order when conditions change (e.g. urgent order insertion).
     */
    async reoptimisePickSequence(sessionId: string) {
        this.logger.log(`Reoptimising pick sequence for session ${sessionId}...`);

        const tasks = await this.prisma.pickingTask.findMany({
            where: { sessionId, status: 'PENDING' },
            include: { sourceLocation: true }
        });

        // Simple optimisation: sort by location name to simulate routing
        tasks.sort((a, b) => {
            const locA = a.sourceLocation?.name || '';
            const locB = b.sourceLocation?.name || '';
            return locA.localeCompare(locB);
        });

        // In a real scenario, this would update an 'order' or 'sequence' column
        return { success: true, reoptimisedTasks: tasks.length };
    }

    /**
     * Monitor zone task density to detect congestion.
     */
    async detectCongestion(warehouseId: string) {
        this.logger.log(`Detecting congestion in warehouse ${warehouseId}...`);
        // Implementation would group active tasks by zone and flag high density areas.
        return { success: true, congestedZones: [] };
    }

    /**
     * Redistribute tasks from overloaded zones.
     */
    async rebalanceWorkload(warehouseId: string) {
        this.logger.log(`Rebalancing workload for warehouse ${warehouseId}...`);
        const { congestedZones } = await this.detectCongestion(warehouseId);

        if (congestedZones.length > 0) {
            // Reassign or pause tasks in congested zones
            this.logger.log(`Found ${congestedZones.length} congested zones, rebalancing...`);
        }

        return { success: true, rebalanced: false };
    }
}
