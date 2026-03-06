import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma.service';
import { AreaType, getRequiredAreaTypes, WarehouseConfig, AREA_TYPE_COLORS } from './area-types';

export interface CreateAreaDto {
    name: string;
    areaType: AreaType;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    color?: string;
    linkedLocationId?: string;
    attributes?: any;
    sequence?: number;
}

export interface UpdateAreaDto {
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    color?: string;
    linkedLocationId?: string;
    attributes?: any;
    active?: boolean;
    sequence?: number;
}

export interface UpdateFloorPlanDto {
    shape?: 'rectangle' | 'u_shape' | 'l_shape' | 'custom';
    vertices?: Array<{ x: number, y: number }>;
    width?: number;
    height?: number;
    gridEnabled?: boolean;
    gridSize?: number;
    snapToGrid?: boolean;
}

export interface LayoutTemplate {
    type: 'I' | 'U' | 'L';
    areas: Partial<CreateAreaDto>[];
}

@Injectable()
export class WarehouseAreaService {
    constructor(private prisma: PrismaService) { }

    async getAreasForWarehouse(warehouseId: string) {
        return this.prisma.warehouseFunctionalArea.findMany({
            where: { warehouseId },
            orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
            include: {
                linkedLocation: {
                    select: { id: true, name: true, structuralType: true }
                }
            }
        });
    }

    async createArea(warehouseId: string, data: CreateAreaDto) {
        // Validate area type against warehouse config
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id: warehouseId },
            select: { incomingSteps: true, outgoingSteps: true }
        });

        if (!warehouse) {
            throw new AppError('WAREHOUSE_NOT_FOUND', { warehouseId });
        }

        const requiredTypes = getRequiredAreaTypes({
            incomingSteps: warehouse.incomingSteps as any,
            outgoingSteps: warehouse.outgoingSteps as any,
        });

        if (!requiredTypes.includes(data.areaType as AreaType)) {
            throw new AppError('AREA_TYPE_NOT_ALLOWED', { areaType: data.areaType });
        }

        return this.prisma.warehouseFunctionalArea.create({
            data: {
                warehouseId,
                name: data.name,
                areaType: data.areaType,
                x: data.x ?? 0,
                y: data.y ?? 0,
                width: data.width ?? 100,
                height: data.height ?? 100,
                rotation: data.rotation ?? 0,
                color: data.color ?? AREA_TYPE_COLORS[data.areaType as AreaType],
                linkedLocationId: data.linkedLocationId,
                attributes: data.attributes ? JSON.stringify(data.attributes) : null,
                sequence: data.sequence ?? 0,
            }
        });
    }

    async updateArea(areaId: string, data: UpdateAreaDto) {
        return this.prisma.warehouseFunctionalArea.update({
            where: { id: areaId },
            data: {
                ...data,
                attributes: data.attributes ? JSON.stringify(data.attributes) : undefined,
            }
        });
    }

    async deleteArea(areaId: string) {
        return this.prisma.warehouseFunctionalArea.delete({
            where: { id: areaId }
        });
    }

    async updateWarehouse(id: string, data: {
        address?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
        phone?: string;
        incomingSteps?: string;
        outgoingSteps?: string;
    }) {
        return this.prisma.warehouse.update({
            where: { id },
            data: {
                address: data.address,
                city: data.city,
                state: data.state,
                postalCode: data.postalCode,
                country: data.country,
                latitude: data.latitude,
                longitude: data.longitude,
                phone: data.phone,
                incomingSteps: data.incomingSteps,
                outgoingSteps: data.outgoingSteps,
            },
        });
    }

    async getSuggestedAreas(warehouseId: string): Promise<{ areaType: string; name: string; color: string; sequence: number }[]> {
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id: warehouseId },
            select: { incomingSteps: true, outgoingSteps: true }
        });

        if (!warehouse) {
            throw new AppError('WAREHOUSE_NOT_FOUND', { warehouseId });
        }

        const requiredTypes = getRequiredAreaTypes({
            incomingSteps: warehouse.incomingSteps as any,
            outgoingSteps: warehouse.outgoingSteps as any,
        });

        return requiredTypes.map((type, index) => ({
            areaType: type,
            name: this.getDefaultName(type),
            color: AREA_TYPE_COLORS[type],
            sequence: index + 1,
        }));
    }

    async getZones(warehouseId: string) {
        const zones = await this.prisma.location.findMany({
            where: {
                warehouseId,
                structuralType: { in: ['ROOM', 'ROW', 'BAY', 'AISLE'] } // Added AISLE
            },
            include: {
                children: {
                    select: { id: true, name: true }
                }
            },
            orderBy: [
                { structuralType: 'asc' },
                { name: 'asc' }
            ]
        });

        return zones.map(zone => {
            let color = undefined;
            if (zone.attributes) {
                try {
                    const attrs = JSON.parse(zone.attributes);
                    color = attrs.color;
                } catch (e) { }
            }

            return {
                id: zone.id,
                name: zone.name,
                code: zone.code,
                structuralType: zone.structuralType,
                x: zone.x || 0,
                y: zone.y || 0,
                width: zone.width || 5, // Defaults if missing
                height: zone.height || 3,
                rotation: zone.rotation || 0,
                parentId: zone.parentId,
                childCount: zone.children.length,
                color
            };
        });
    }

    async getBinUtilization(warehouseId: string) {
        // Query bins directly for the specified warehouse
        const bins = await this.prisma.location.findMany({
            where: {
                warehouseId: warehouseId,
                OR: [
                    { structuralType: 'POSITION' },
                    { structuralType: 'BIN' },
                    { structuralType: 'SHELF' }
                ]
            },
            include: {
                batches: {
                    where: { currentQuantity: { gt: 0 } },
                    include: {
                        product: {
                            select: {
                                sku: true,
                                name: true,
                                weight: true
                            }
                        }
                    }
                },
                parent: {
                    include: {
                        parent: {
                            include: {
                                parent: true
                            }
                        }
                    }
                }
            }
        });

        return bins.map(bin => this.calculateBinUtilization(bin));
    }

    private calculateBinUtilization(bin: any) {
        // Calculate current weight from batches
        const batches = bin.batches || [];
        const currentWeight = batches.reduce((sum: number, batch: any) => {
            const productWeight = batch.product?.weight || 0;
            return sum + (productWeight * batch.currentQuantity);
        }, 0);

        // Calculate total items
        const currentItems = batches.reduce((sum: number, batch: any) =>
            sum + batch.currentQuantity, 0
        );

        // Calculate utilization percentages
        const maxWeight = bin.maxWeight || bin.maxWeightKg || 0;
        const maxVolume = bin.maxVolume || 0;

        const weightUtilization = maxWeight > 0 ? (currentWeight / maxWeight) * 100 : 0;
        const volumeUtilization = 0; // TODO: Calculate from product volumes
        const itemUtilization = 0; // Would need maxItems field

        const overallUtilization = Math.max(weightUtilization, volumeUtilization, itemUtilization);

        // Build location path
        const locationPath = this.buildLocationPath(bin);

        return {
            id: bin.id,
            name: bin.name,
            code: bin.code || bin.name,
            locationPath,

            // Position
            x: bin.x || 0,
            y: bin.y || 0,
            width: bin.width || 1,
            height: bin.height || 1,
            rotation: bin.rotation || 0,

            // Capacity
            maxWeight: maxWeight,
            maxVolume: maxVolume,
            maxItems: 0,

            // Current Usage
            currentWeight: Math.round(currentWeight * 100) / 100,
            currentVolume: 0,
            currentItems,

            // Utilization Percentages
            weightUtilization: Math.round(weightUtilization * 10) / 10,
            volumeUtilization: Math.round(volumeUtilization * 10) / 10,
            itemUtilization: Math.round(itemUtilization * 10) / 10,
            overallUtilization: Math.round(overallUtilization * 10) / 10,

            // Stock info
            stockItems: batches.map((batch: any) => ({
                productCode: batch.product?.sku || 'UNKNOWN',
                productName: batch.product?.name || 'Unknown Product',
                quantity: batch.currentQuantity,
                weight: ((batch.product?.weight || 0) * batch.currentQuantity),
                volume: 0
            }))
        };
    }

    private buildLocationPath(location: any): string {
        const parts: string[] = [];
        let current = location;

        while (current) {
            if (current.name) {
                parts.unshift(current.name);
            }
            current = current.parent;
        }

        return parts.join(' > ');
    }

    async getSuggestedLayout(warehouseId: string, layoutType: 'I' | 'U' | 'L'): Promise<LayoutTemplate> {
        const suggestedAreas = await this.getSuggestedAreas(warehouseId);

        let areas: Partial<CreateAreaDto>[] = [];

        switch (layoutType) {
            case 'I':
                areas = this.generateIShapedLayout(suggestedAreas);
                break;
            case 'U':
                areas = this.generateUShapedLayout(suggestedAreas);
                break;
            case 'L':
                areas = this.generateLShapedLayout(suggestedAreas);
                break;
        }

        return { type: layoutType, areas };
    }

    private getDefaultName(areaType: AreaType): string {
        const names = {
            [AreaType.RECEIVING]: 'Receiving Dock',
            [AreaType.STAGING]: 'Staging Area',
            [AreaType.PUTAWAY_LANE]: 'Putaway Lane',
            [AreaType.STORAGE]: 'Main Storage',
            [AreaType.PICKING]: 'Picking Zone',
            [AreaType.PACKING]: 'Packing Station',
            [AreaType.SHIPPING]: 'Shipping Dock',
        };
        return names[areaType] || areaType;
    }

    private generateIShapedLayout(suggestedAreas: any[]): Partial<CreateAreaDto>[] {
        // Linear horizontal layout
        return suggestedAreas.map((area, index) => ({
            name: area.name,
            areaType: area.areaType,
            x: 50 + index * 220,
            y: 400,
            width: 200,
            height: 150,
            rotation: 0,
            color: area.color,
            sequence: index + 1,
        }));
    }

    private generateUShapedLayout(suggestedAreas: any[]): Partial<CreateAreaDto>[] {
        const areas: Partial<CreateAreaDto>[] = [];
        const totalAreas = suggestedAreas.length;
        const leftSideCount = Math.ceil(totalAreas / 2);

        suggestedAreas.forEach((area, index) => {
            if (index < leftSideCount) {
                // Left side (top to bottom)
                areas.push({
                    name: area.name,
                    areaType: area.areaType,
                    x: 100,
                    y: 100 + index * 180,
                    width: 200,
                    height: 150,
                    rotation: 0,
                    color: area.color,
                    sequence: index + 1,
                });
            } else {
                // Right side (bottom to top)
                const rightIndex = index - leftSideCount;
                areas.push({
                    name: area.name,
                    areaType: area.areaType,
                    x: 1200,
                    y: 100 + (totalAreas - index - 1) * 180,
                    width: 200,
                    height: 150,
                    rotation: 0,
                    color: area.color,
                    sequence: index + 1,
                });
            }
        });

        return areas;
    }

    private generateLShapedLayout(suggestedAreas: any[]): Partial<CreateAreaDto>[] {
        const areas: Partial<CreateAreaDto>[] = [];
        const halfCount = Math.ceil(suggestedAreas.length / 2);

        suggestedAreas.forEach((area, index) => {
            if (index < halfCount) {
                // Horizontal part
                areas.push({
                    name: area.name,
                    areaType: area.areaType,
                    x: 100 + index * 220,
                    y: 100,
                    width: 200,
                    height: 150,
                    rotation: 0,
                    color: area.color,
                    sequence: index + 1,
                });
            } else {
                // Vertical part
                const vertIndex = index - halfCount;
                areas.push({
                    name: area.name,
                    areaType: area.areaType,
                    x: 100 + (halfCount - 1) * 220,
                    y: 300 + vertIndex * 180,
                    width: 200,
                    height: 150,
                    rotation: 0,
                    color: area.color,
                    sequence: index + 1,
                });
            }
        });

        return areas;
    }

    async updateFloorPlan(warehouseId: string, data: UpdateFloorPlanDto) {
        const updateData: any = {};

        if (data.shape !== undefined) {
            updateData.floorPlanShape = data.shape;
        }
        if (data.vertices !== undefined) {
            // Store as JSON string
            updateData.floorPlanVertices = JSON.stringify(data.vertices);
        }
        if (data.width !== undefined) {
            updateData.floorPlanWidth = data.width;
        }
        if (data.height !== undefined) {
            updateData.floorPlanHeight = data.height;
        }
        if (data.gridEnabled !== undefined) {
            updateData.gridEnabled = data.gridEnabled;
        }
        if (data.gridSize !== undefined) {
            updateData.gridSize = data.gridSize;
        }
        if (data.snapToGrid !== undefined) {
            updateData.snapToGrid = data.snapToGrid;
        }

        return this.prisma.warehouse.update({
            where: { id: warehouseId },
            data: updateData,
            select: {
                id: true,
                name: true,
                floorPlanShape: true,
                floorPlanVertices: true,
                floorPlanWidth: true,
                floorPlanHeight: true,
                gridEnabled: true,
                gridSize: true,
                snapToGrid: true
            }
        });
    }
    async checkWarehouseDependencies(id: string) {
        const errors: string[] = [];
        let blocking = false;

        // 1. Check Inventory
        const inventoryCount = await this.prisma.productInventory.count({
            where: {
                warehouseId: id,
                quantity: { gt: 0 }
            }
        });

        if (inventoryCount > 0) {
            errors.push(`${inventoryCount} Active Inventory Items`);
            blocking = true;
        }

        // 2. Check Inventory Batches
        const batchCount = await this.prisma.inventoryBatch.count({
            where: {
                warehouseId: id,
                status: 'Active'
            }
        });

        if (batchCount > 0) {
            errors.push(`${batchCount} Active Batches`);
            blocking = true;
        }

        // 3. Check Active Orders (Source or Destination)
        const activeOrders = await this.prisma.order.count({
            where: {
                OR: [
                    { warehouseId: id },
                    { destinationWarehouseId: id }
                ],
                status: {
                    notIn: ['SHIPPED', 'DELIVERED', 'CANCELLED']
                }
            }
        });

        if (activeOrders > 0) {
            errors.push(`${activeOrders} Active Orders`);
            blocking = true;
        }

        // 4. Check Open Tasks (Picking/Putaway)
        const openPickingSessions = await this.prisma.pickingSession.count({
            where: { warehouseId: id, status: { not: 'COMPLETED' } }
        });

        if (openPickingSessions > 0) {
            errors.push(`${openPickingSessions} Open Picking Sessions`);
            blocking = true;
        }

        // 5. Check Locations (Prevent accidental deletion of hierarchy)
        const locationCount = await this.prisma.location.count({
            where: { warehouseId: id }
        });

        if (locationCount > 0) {
            errors.push(`${locationCount} Locations defined`);
            blocking = true;
        }

        return {
            hasDependencies: errors.length > 0,
            dependencies: errors,
            blocking
        };
    }

    async deleteWarehouse(id: string) {
        const check = await this.checkWarehouseDependencies(id);
        if (check.blocking) {
            throw new AppError('CANNOT_DELETE_WAREHOUSE', { dependencies: check.dependencies.join(', ') });
        }

        // Safe to delete related data first (Cascade)

        // 1. Delete empty inventory records (0 qty)
        await this.prisma.productInventory.deleteMany({ where: { warehouseId: id } });

        // 2. Delete Functional Areas
        await this.prisma.warehouseFunctionalArea.deleteMany({ where: { warehouseId: id } });

        // 3. Delete Locations
        await this.prisma.location.deleteMany({ where: { warehouseId: id } });

        // 4. Delete Warehouse
        return this.prisma.warehouse.delete({
            where: { id }
        });
    }
}
