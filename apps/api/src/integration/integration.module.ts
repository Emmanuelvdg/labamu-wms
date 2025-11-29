import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [InventoryModule],
    controllers: [IntegrationController],
    providers: [IntegrationService, PrismaService],
})
export class IntegrationModule { }
