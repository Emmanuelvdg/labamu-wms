import { Module } from '@nestjs/common';
import { InventoryModule } from './inventory/inventory.module';
import { StrategyModule } from './strategy/strategy.module';
import { OrderModule } from './order/order.module';
import { IntegrationModule } from './integration/integration.module';
import { ReportingModule } from './reporting/reporting.module';

@Module({
    imports: [InventoryModule, StrategyModule, OrderModule, IntegrationModule, ReportingModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
