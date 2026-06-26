import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, Res, Header, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FloorplanImportExportService } from './floorplan-import-export.service';
import { Response } from 'express';
import { PermissionsGuard } from '../common/auth/permissions.guard';

@Controller('floorplan')
@UseGuards(PermissionsGuard)
export class FloorplanImportExportController {
    constructor(private readonly service: FloorplanImportExportService) { }

    @Get(':warehouseId/export')
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="floorplan-export.csv"')
    async exportFloorplan(@Param('warehouseId') warehouseId: string, @Res() res: Response) {
        try {
            const csv = await this.service.exportFloorplan(warehouseId);
            res.send(csv);
        } catch (error) {
            throw new BadRequestException('Failed to export floorplan');
        }
    }

    @Post(':warehouseId/import')
    @UseInterceptors(FileInterceptor('file'))
    async importFloorplan(
        @Param('warehouseId') warehouseId: string,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        return this.service.importFloorplan(warehouseId, file.buffer);
    }
}
