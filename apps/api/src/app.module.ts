
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
import { AuthModule } from './auth/auth.module';
import { StoModule } from './sto/sto.module';
import { ShippingModule } from './shipping/shipping.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { PutawayModule } from './inventory/putaway.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { LalamoveModule } from './lalamove/lalamove.module';
import { ReturnsModule } from './returns/returns.module';
import { StocktakingModule } from './stocktaking/stocktaking.module';

import { DeliveryMethodsController } from './configuration/delivery-methods.controller';
import { PrismaService } from './prisma.service';

@Module({
    imports: [
        InventoryModule,
        StrategyModule,
        OrderModule,
        IntegrationModule,
        ReportingModule,
        PurchaseOrderModule,
        RuleModule,
        SupplierModule,
        FulfillmentModule,
        CustomerModule,
        SettingsModule,
        InvoiceModule,
        AuthModule,
        StoModule,
        ShippingModule,
        WarehouseModule,
        PutawayModule,
        ApiKeyModule,
        LalamoveModule,
        ReturnsModule,
        StocktakingModule,
    ],
    controllers: [DeliveryMethodsController],
    providers: [PrismaService],
})
export class AppModule { }
