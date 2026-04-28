import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WarehouseAreaController } from './warehouse-area.controller';
import { WarehouseAreaService } from './warehouse-area.service';
import { FloorplanImportExportController } from './floorplan-import-export.controller';
import { FloorplanImportExportService } from './floorplan-import-export.service';
import { CompanyModule } from '../company/company.module';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';

@Module({
    imports: [CompanyModule],
    controllers: [WarehouseAreaController, FloorplanImportExportController],
    providers: [PrismaService, WarehouseAreaService, FloorplanImportExportService, FeatureFlagGuard],
    exports: [WarehouseAreaService, FloorplanImportExportService],
})
export class WarehouseModule { }
