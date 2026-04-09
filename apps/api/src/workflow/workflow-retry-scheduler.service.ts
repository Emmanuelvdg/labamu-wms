import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowEngineService } from './workflow-engine.service';

@Injectable()
export class WorkflowRetrySchedulerService {
    private readonly logger = new Logger(WorkflowRetrySchedulerService.name);

    constructor(private engineService: WorkflowEngineService) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async runRetryCheck() {
        this.logger.log('Running eligible retry check...');
        await this.engineService.executeEligibleRetries();
    }
}
