import { Module } from '@nestjs/common';
import { RuleService } from './rule.service';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [InventoryModule],
    providers: [RuleService, PrismaService],
    exports: [RuleService],
})
export class RuleModule { }
