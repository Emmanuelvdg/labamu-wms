import { Module } from '@nestjs/common';
import { InventoryModule } from './inventory/inventory.module';
import { StrategyModule } from './strategy/strategy.module';
import { OrderModule } from './order/order.module';
import { IntegrationModule } from './integration/integration.module';
import { ReportingModule } from './reporting/reporting.module';
import { PurchaseOrderModule } from './purchase-order/purchase-order.module';
import { RuleModule } from './rule/rule.module';
import { SupplierModule } from './supplier/supplier.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { CustomerModule } from './customer/customer.module';
import { SettingsModule } from './settings/settings.module';
import { InvoiceModule } from './invoice/invoice.module';

@Module({
    imports: [InventoryModule, StrategyModule, OrderModule, IntegrationModule, ReportingModule, PurchaseOrderModule, RuleModule, SupplierModule, FulfillmentModule, CustomerModule, SettingsModule, InvoiceModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
// Force rebuild
