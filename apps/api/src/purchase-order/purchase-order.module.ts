import { Module } from '@nestjs/common';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
import {  } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { RuleModule } from '../rule/rule.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [InventoryModule, RuleModule, NotificationModule],
    controllers: [PurchaseOrderController],
    providers: [PurchaseOrderService],
    exports: [PurchaseOrderService],
})
export class PurchaseOrderModule { }
