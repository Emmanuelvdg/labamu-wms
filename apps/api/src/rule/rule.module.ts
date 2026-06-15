import { Module } from '@nestjs/common';
import { RuleService } from './rule.service';
import {  } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { OutboundRoutingListener } from './outbound-routing.listener';
import { InboundRoutingListener } from './inbound-routing.listener';

@Module({
    imports: [InventoryModule, WorkflowModule],
    providers: [RuleService, OutboundRoutingListener, InboundRoutingListener],
    exports: [RuleService],
})
export class RuleModule { }
