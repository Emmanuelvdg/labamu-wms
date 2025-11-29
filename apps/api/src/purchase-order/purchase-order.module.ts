import { Module } from '@nestjs/common';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { RuleModule } from '../rule/rule.module';

@Module({
    imports: [InventoryModule, RuleModule],
    controllers: [PurchaseOrderController],
    providers: [PurchaseOrderService, PrismaService],
    exports: [PurchaseOrderService],
})
export class PurchaseOrderModule { }
