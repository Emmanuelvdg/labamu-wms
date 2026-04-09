import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowSlaCheckerService } from './workflow-sla-checker.service';

@Injectable()
export class WorkflowSlaSchedulerService {
    private readonly logger = new Logger(WorkflowSlaSchedulerService.name);

    constructor(private slaChecker: WorkflowSlaCheckerService) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    async runSlaCheck() {
        this.logger.log('Running SLA breach check...');
        await this.slaChecker.checkOverdueTasks();
    }
}
