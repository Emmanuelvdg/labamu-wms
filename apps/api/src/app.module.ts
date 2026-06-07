
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
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
import { PrintingModule } from './printing/printing.module';
import { PackingModule } from './packing/packing.module';
import { NotificationModule } from './notifications/notification.module';
import { OperationalAuditModule } from './audit/operational-audit.module';
import { CommonFeaturesModule } from './common/common.module';
import { WorkflowModule } from './workflow/workflow.module';
import { BarcodeModule } from './barcode/barcode.module';
import { RoutingModule } from './routing/routing.module';
import { CompanyModule } from './company/company.module';
import { CurrencyModule } from './currency/currency.module';
import { SupplierAuthModule } from './supplier-auth/supplier-auth.module';

import { DeliveryMethodsController } from './configuration/delivery-methods.controller';
import { DeliveryMethodsAliasController } from './configuration/delivery-methods-alias.controller';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';

@Module({
    imports: [
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
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
        PrintingModule,
        PackingModule,
        NotificationModule,
        OperationalAuditModule,
        CommonFeaturesModule,
        WorkflowModule,
        BarcodeModule,
        RoutingModule,
        CurrencyModule,
        SupplierAuthModule,
        CompanyModule,
    ],
    controllers: [DeliveryMethodsController, DeliveryMethodsAliasController, HealthController],
    providers: [
        PrismaService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        }
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(TenantMiddleware).forRoutes('*');
    }
}
