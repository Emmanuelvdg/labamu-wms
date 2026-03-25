import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class FloorplanImportExportService {
    private readonly logger = new Logger(FloorplanImportExportService.name);

    constructor(private prisma: PrismaService) {}

    async exportFloorplan(warehouseId: string): Promise<string> {
        // Get all functional areas for the warehouse
        const areas = await this.prisma.warehouseFunctionalArea.findMany({
            where: { warehouseId },
            include: { locations: true }
        });

        // Get all locations for this warehouse
        const locations = await this.prisma.location.findMany({
            where: { warehouseId },
            include: { functionalArea: true }
        });

        // Format for CSV
        const records = [];
        
        // Add Areas
        for (const area of areas) {
            records.push({
                Type: 'AREA',
                Id: area.id,
                Name: area.name,
                AreaType: area.areaType,
                ShapeType: area.shapeType || 'rectangle',
                X: area.x,
                Y: area.y,
                Width: area.width,
                Height: area.height,
                Rotation: area.rotation,
                Color: area.color || '',
                ParentLocationId: '',
                FunctionalAreaId: ''
            });
        }

        // Add Locations
        for (const loc of locations) {
            records.push({
                Type: 'LOCATION',
                Id: loc.id,
                Name: loc.name,
                AreaType: loc.structuralType || loc.type,
                ShapeType: '',
                X: loc.x || 0,
                Y: loc.y || 0,
                Width: loc.width || 1,
                Height: loc.height || 1,
                Rotation: loc.rotation || 0,
                Color: '',
                ParentLocationId: loc.parentId || '',
                FunctionalAreaId: loc.functionalAreaId || ''
            });
        }

        return stringify(records, {
            header: true,
            columns: ['Type', 'Id', 'Name', 'AreaType', 'ShapeType', 'X', 'Y', 'Width', 'Height', 'Rotation', 'Color', 'ParentLocationId', 'FunctionalAreaId']
        });
    }

    async importFloorplan(warehouseId: string, fileBuffer: Buffer): Promise<any> {
        try {
            const records: any[] = csv.parse(fileBuffer, {
                columns: true,
                skip_empty_lines: true,
            });

            let areasCount = 0;
            let locationsCount = 0;

            // Simple transactional bulk updates
            await this.prisma.$transaction(async (tx) => {
                for (const record of records) {
                    if (record.Type === 'AREA') {
                        // Upsert Area
                        const data = {
                            warehouseId,
                            name: record.Name,
                            areaType: record.AreaType,
                            shapeType: record.ShapeType || 'rectangle',
                            x: parseFloat(record.X) || 0,
                            y: parseFloat(record.Y) || 0,
                            width: parseFloat(record.Width) || 10,
                            height: parseFloat(record.Height) || 10,
                            rotation: parseFloat(record.Rotation) || 0,
                            color: record.Color || '#cccccc',
                        };

                        if (record.Id && record.Id.trim() !== '') {
                            await tx.warehouseFunctionalArea.upsert({
                                where: { id: record.Id },
                                update: data,
                                create: { id: record.Id, ...data }
                            });
                        } else {
                            await tx.warehouseFunctionalArea.create({ data });
                        }
                        areasCount++;
                    } else if (record.Type === 'LOCATION') {
                        // Upsert Location
                        const data: any = {
                            warehouseId,
                            name: record.Name,
                            type: record.AreaType === 'ROOM' ? 'ROOM' : 'STORAGE',
                            structuralType: record.AreaType,
                            x: parseFloat(record.X) || 0,
                            y: parseFloat(record.Y) || 0,
                            width: parseFloat(record.Width) || 1,
                            height: parseFloat(record.Height) || 1,
                            rotation: parseFloat(record.Rotation) || 0,
                            parentId: record.ParentLocationId && record.ParentLocationId.trim() !== '' ? record.ParentLocationId : null,
                            functionalAreaId: record.FunctionalAreaId && record.FunctionalAreaId.trim() !== '' ? record.FunctionalAreaId : null,
                        };

                        if (record.Id && record.Id.trim() !== '') {
                             await tx.location.upsert({
                                where: { id: record.Id },
                                update: data,
                                create: { id: record.Id, ...data }
                            });
                        } else {
                            await tx.location.create({ data });
                        }
                        locationsCount++;
                    }
                }
            });

            return { success: true, importedAreas: areasCount, importedLocations: locationsCount };
        } catch (error) {
            this.logger.error('Import failed', error);
            throw new BadRequestException('Failed to import floorplan CSV: ' + (error as any).message);
        }
    }
}
