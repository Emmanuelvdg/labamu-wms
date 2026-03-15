import { Module } from '@nestjs/common';
import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowValidationService } from './workflow-validation.service';
import { WorkflowTemplateController } from './workflow-template.controller';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowExecutionController } from './workflow-execution.controller';
import { TaskOptimisationService } from './task-optimisation.service';
import { PrismaService } from '../prisma.service';
import { ConditionHandler } from './handlers/condition-handler';
import { ReceiveHandler } from './handlers/receive-handler';
import { PickHandler } from './handlers/pick-handler';
import { PutawayHandler } from './handlers/putaway-handler';
import { QcHandler } from './handlers/qc-handler';
import { StageHandler } from './handlers/stage-handler';
import { PackHandler } from './handlers/pack-handler';
import { CrossdockHandler } from './handlers/crossdock-handler';
import { ShipHandler } from './handlers/ship-handler';
import { ConsolidateHandler } from './handlers/consolidate-handler';
import { ReturnHandler } from './handlers/return-handler';
import { ReplenishHandler } from './handlers/replenish-handler';
import { StrategyModule } from '../strategy/strategy.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [StrategyModule, InventoryModule],
    controllers: [WorkflowTemplateController, WorkflowExecutionController],
    providers: [
        WorkflowTemplateService,
        WorkflowValidationService,
        WorkflowEngineService,
        TaskOptimisationService,
        PrismaService,
        ConditionHandler,
        ReceiveHandler,
        PickHandler,
        PutawayHandler,
        QcHandler,
        StageHandler,
        PackHandler,
        CrossdockHandler,
        ShipHandler,
        ConsolidateHandler,
        ReturnHandler,
        ReplenishHandler
    ],
    exports: [WorkflowTemplateService, WorkflowEngineService, TaskOptimisationService]
})
export class WorkflowModule { }
