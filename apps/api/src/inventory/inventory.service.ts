import * as fs from 'fs';
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { parse as csvParse } from 'csv-parse/sync';
import * as bwipjs from 'bwip-js';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma.service';
import { Product, Warehouse, ProductInventory, InventoryBatch } from '@labamu/database';
import { OperationalAuditService } from '../audit/operational-audit.service';

import { PackagingService } from './packaging.service';
import { PutawayService } from './putaway.service';
import { UtilisationService } from './utilisation.service';
import { RotationRuleResolverService } from './rotation-rule-resolver.service';
import { getRequiredAreaTypes, AREA_TYPE_LABELS } from '../warehouse/area-types';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    private log(message: string) {
        const logPath = 'c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\debug_reservation.log';
        fs.appendFileSync(logPath, `[InventoryService] ${message}\n`);
        this.logger.debug(`[InventoryService] ${message}`);
    }

    constructor(
        private prisma: PrismaService,
        private packagingService: PackagingService,
        private putawayService: PutawayService,
        private utilisationService: UtilisationService,
        private ruleResolver: RotationRuleResolverService,
        private auditLog: OperationalAuditService,
    ) { }

    /**
     * Export locations to CSV
     */
    async exportLocations(warehouseId: string): Promise<string> {
        const locations = await this.prisma.location.findMany({
            where: { warehouseId },
            orderBy: { fullAddress: 'asc' }, // Order by hierarchy
            include: { dynamicAttributes: { include: { definition: true } } }
        });

        const header = [
            'ID', 'Name', 'Code', 'Type', 'StructuralType', 'ParentCode',
            'X', 'Y', 'Width', 'Height', 'Rotation',
            'MaxWeightKg', 'MaxVolume', 'Attributes'
        ].join(',');

        const rows = locations.map(loc => {
            // Find parent code if parentId exists (optimization: could map beforehand)
            const parentCode = loc.parentId ? locations.find(l => l.id === loc.parentId)?.code || '' : '';

            // Format attributes
            let attrStr = '';
            if (loc.dynamicAttributes && loc.dynamicAttributes.length > 0) {
                attrStr = loc.dynamicAttributes.map(da => `${da.definition.name}:${da.value}`).join('|');
            }

            return [
                loc.id,
                `"${loc.name.replace(/"/g, '""')}"`, // Escape quotes
                loc.code || '',
                loc.type || '',
                loc.structuralType || '',
                parentCode,
                loc.x || 0,
                loc.y || 0,
                loc.width || 0,
                loc.height || 0,
                loc.rotation || 0,
                loc.maxWeightKg || 0,
                loc.maxVolume || 0,
                `"${attrStr}"`
            ].join(',');
        });

        return [header, ...rows].join('\n');
    }

    /**
     * Import locations from CSV
     * Expected format: Name, Code, StructuralType, ParentCode, X, Y, Width, Height, Attributes
     */
    async importLocations(csvContent: string, warehouseId: string) {
        let records: Record<string, string>[];
        try {
            records = csvParse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
        } catch {
            throw new BadRequestException('Invalid CSV format — could not parse file');
        }
        if (!records.length || !('Name' in records[0]) || !('StructuralType' in records[0])) {
            throw new BadRequestException('Invalid CSV format. Required columns: Name, StructuralType');
        }

        const results = { created: 0, updated: 0, errors: [] as string[] };

        // Cache existing locations for parent lookups
        const existingLocations = await this.prisma.location.findMany({
            where: { warehouseId }
        });
        const codeMap = new Map<string, string>(); // Code -> ID
        existingLocations.forEach(l => {
            if (l.code) codeMap.set(l.code, l.id);
        });

        for (const record of records) {
            try {
                const getVal = (header: string) => record[header] || undefined;

                const name = getVal('Name');
                const code = getVal('Code') || name?.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
                const structuralType = getVal('StructuralType');
                const parentCode = getVal('ParentCode');
                const id = getVal('ID'); // If ID is provided, it's an update

                if (!name || !structuralType) continue;

                // Resolve Parent
                let parentId: string | undefined = undefined;
                if (parentCode && codeMap.has(parentCode)) {
                    parentId = codeMap.get(parentCode);
                } else if (parentCode) {
                    // Start of batch, maybe parent created in previous loop?
                    // Refresh map? Or just error. 
                    // For now, assume parent must exist or be created before child in CSV order.
                    // Let's check DB again if not in initial map (slow but safe)
                    const p = await this.prisma.location.findFirst({
                        where: { warehouseId, code: parentCode }
                    });
                    if (p) parentId = p.id;
                    else throw new AppError('PARENT_CODE_NOT_FOUND', { parentCode });
                }

                const locationData = {
                    name,
                    code,
                    structuralType,
                    warehouseId,
                    parentId,
                    x: parseFloat(getVal('X') || '0'),
                    y: parseFloat(getVal('Y') || '0'),
                    width: parseFloat(getVal('Width') || '1'),
                    height: parseFloat(getVal('Height') || '1'),
                    rotation: parseFloat(getVal('Rotation') || '0'),
                    maxWeightKg: parseFloat(getVal('MaxWeightKg') || '0'),
                    maxVolume: parseFloat(getVal('MaxVolume') || '0'),
                };

                // Check if updating or creating
                let locationId = id;
                if (!locationId) {
                    // Try to find by Code if no ID
                    if (codeMap.has(code!)) locationId = codeMap.get(code!);
                }

                if (locationId) {
                    await this.prisma.location.update({
                        where: { id: locationId },
                        data: locationData
                    });
                    results.updated++;
                } else {
                    const newLoc = await this.createLocation({
                        ...locationData,
                        type: 'VIEW' // Default
                    });
                    if (newLoc.code) codeMap.set(newLoc.code, newLoc.id);
                    results.created++;
                }

                // Attributes parsing (simple k:v|k:v)
                const attrStr = getVal('Attributes');
                if (attrStr) {
                    // Logic to update/create dynamic attributes...
                    // Skipping for brevity in this initial pass, focus on structure.
                }

            } catch (err: any) {
                results.errors.push(`Row error: ${err.message}`);
            }
        }

        return results;
    }

    async createProduct(data: any): Promise<Product> {
        if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
            throw new BadRequestException('Product name is required');
        }

        // Phase 4: Extract attribute IDs and create relations
        const { attributeIds, packaging, ...productData } = data;

        try {
            const product = await this.prisma.product.create({
                data: {
                    sku: productData.sku,
                    name: productData.name,
                    category: productData.category,
                    expiryDate: productData.expiryDate ? new Date(productData.expiryDate) : null,
                    classification: productData.classification,
                    velocity: productData.velocity,
                    type: productData.type,
                    unitOfMeasure: productData.unitOfMeasure,
                    averageCost: productData.averageCost,
                    price: productData.price,
                    status: productData.status,
                    tracking: productData.tracking || 'none',
                    // Dimensions
                    width: productData.width ? parseFloat(productData.width) : undefined,
                    height: productData.height ? parseFloat(productData.height) : undefined,
                    depth: productData.depth ? parseFloat(productData.depth) : undefined,
                    weight: productData.weight ? parseFloat(productData.weight) : undefined,
                    // Create attribute relations
                    attributes: {
                        create: attributeIds?.map((attrId: string) => ({
                            attributeDefinitionId: attrId,
                            value: 'true'
                        })) || []
                    }
                },
                include: {
                    attributes: {
                        include: {
                            attributeDefinition: true
                        }
                    }
                }
            });

            // Handle Packaging
            if (packaging && Array.isArray(packaging)) {
                for (const pkg of packaging) {
                    await this.packagingService.createPackaging({
                        ...pkg,
                        productId: product.id,
                    });
                }
            }

            return product;
        } catch (e: any) {
            if (e?.code === 'P2002') {
                throw new ConflictException(`A product with SKU '${data.sku}' already exists`);
            }
            throw e;
        }
    }

    async updateProduct(id: string, data: any) {
        // Update Product Fields
        const product = await this.prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                category: data.category,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
                classification: data.classification,
                velocity: data.velocity,
                type: data.type,
                unitOfMeasure: data.unitOfMeasure,
                averageCost: data.averageCost,
                status: data.status,
                tracking: data.tracking,
                requiredAttributeId: data.requiredAttributeId,
                width: data.width ? parseFloat(data.width) : undefined,
                height: data.height ? parseFloat(data.height) : undefined,
                depth: data.depth ? parseFloat(data.depth) : undefined,
                weight: data.weight ? parseFloat(data.weight) : undefined,
            },
        });

        // Update Packaging (Replace Strategy)
        if (data.packaging && Array.isArray(data.packaging)) {
            // Delete existing
            const existing = await this.packagingService.getPackaging(id);
            for (const pkg of existing) {
                await this.packagingService.deletePackaging(pkg.id);
            }
            // Create new
            for (const pkg of data.packaging) {
                await this.packagingService.createPackaging({
                    ...pkg,
                    productId: id,
                });
            }
        }

        return product;
    }

    async createSupplier(data: { name: string; contactInfo?: string }) {
        return this.prisma.supplier.create({
            data: {
                name: data.name,
                contactInfo: data.contactInfo,
            },
        });
    }

    async bulkCreateProducts(items: any[]): Promise<{ created: any[]; errors: { index: number; item: any; error: string }[] }> {
        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestException('items must be a non-empty array');
        }
        if (items.length > 500) {
            throw new BadRequestException('Bulk create is limited to 500 items per request');
        }
        const created: any[] = [];
        const errors: { index: number; item: any; error: string }[] = [];
        const BATCH = 50;
        for (let i = 0; i < items.length; i += BATCH) {
            const batch = items.slice(i, i + BATCH);
            const results = await Promise.allSettled(batch.map((item) => this.createProduct({
                ...item,
                price: item.price ?? item.sellingPrice,
                averageCost: item.averageCost ?? item.unitCost,
                velocity: item.velocity ?? item.velocityClass,
                category: item.category ?? item.categoryId,
            })));
            results.forEach((r, j) => {
                if (r.status === 'fulfilled') {
                    created.push(r.value);
                } else {
                    errors.push({ index: i + j, item: batch[j], error: r.reason?.message ?? String(r.reason) });
                }
            });
        }
        return { created, errors };
    }

    async bulkCreateSuppliers(items: { name: string; contactInfo?: string }[]): Promise<{ created: any[]; errors: { index: number; item: any; error: string }[] }> {
        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestException('items must be a non-empty array');
        }
        if (items.length > 500) {
            throw new BadRequestException('Bulk create is limited to 500 items per request');
        }
        const created: any[] = [];
        const errors: { index: number; item: any; error: string }[] = [];
        const BATCH = 50;
        for (let i = 0; i < items.length; i += BATCH) {
            const batch = items.slice(i, i + BATCH);
            const results = await Promise.allSettled(batch.map((item) => this.createSupplier(item)));
            results.forEach((r, j) => {
                if (r.status === 'fulfilled') {
                    created.push(r.value);
                } else {
                    errors.push({ index: i + j, item: batch[j], error: r.reason?.message ?? String(r.reason) });
                }
            });
        }
        return { created, errors };
    }

    async getProducts(filters?: {
        search?: string;
        category?: string;
        classification?: string;
        warehouseId?: string;
        take?: number;
        skip?: number;
    }): Promise<any> {
        const take = filters?.take ?? 50;
        const skip = filters?.skip ?? 0;
        const where: any = {};

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search } },
                { sku: { contains: filters.search } },
            ];
        }

        if (filters?.category) {
            where.category = filters.category;
        }

        if (filters?.classification) {
            where.classification = filters.classification;
        }

        if (filters?.warehouseId) {
            where.inventory = {
                some: {
                    warehouseId: filters.warehouseId,
                }
            };
        }

        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                take,
                skip,
                include: {
                    inventory: {
                        where: filters?.warehouseId ? { warehouseId: filters.warehouseId } : undefined
                    },
                    purchaseOrderItems: {
                        where: {
                            purchaseOrder: {
                                status: { in: ['ORDERED', 'APPROVED', 'PARTIAL_RECEIVED'] }
                            }
                        },
                        select: { quantity: true }
                    },
                    orderItems: {
                        where: {
                            order: {
                                status: { in: ['RESERVED', 'PICKING', 'PACKING', 'PARTIAL'] }
                            }
                        },
                        select: { quantity: true }
                    }
                }
            }),
            this.prisma.product.count({ where }),
        ]);

        const data = products.map(p => {
            const onHand = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
            const reserved = p.inventory.reduce((sum, inv) => sum + (inv.reserved || 0), 0);
            const incoming = p.purchaseOrderItems.reduce((sum, item) => sum + item.quantity, 0);
            const outgoing = p.orderItems.reduce((sum, item) => sum + item.quantity, 0);
            return { ...p, onHand, free: onHand - reserved, incoming, outgoing, reserved };
        });

        return { data, total, limit: take, offset: skip };
    }

    async getProduct(id: string): Promise<Product | null> {
        return this.prisma.product.findUnique({
            where: { id },
            include: {
                attributes: true,
                packaging: true,
            },
        });
    }

    async findProductStockLocations(productId: string): Promise<{ warehouseId: string, quantity: number, available: number }[]> {
        const inventory = await this.prisma.productInventory.findMany({
            where: { productId, quantity: { gt: 0 } },
            orderBy: { quantity: 'desc' },
            include: { warehouse: true } // Ensure warehouse exists
        });

        return inventory.map(inv => ({
            warehouseId: inv.warehouseId,
            quantity: inv.quantity,
            available: inv.quantity - inv.reserved
        }));
    }

    async createWarehouse(data: {
        name: string;
        shortName: string;
        address: string;
        companyId: string;
        location: any;
        type: string;
        // Physical Dimensions
        length?: number;
        width?: number;
        height?: number;
        maxWeight?: number;
        status?: string;
        // Address Details
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
        phone?: string;
        // Route Config
        incomingSteps?: string;
        outgoingSteps?: string;
        dropshipSubcontractors?: boolean;
        resupplySubcontractors?: boolean;
        manufactureToResupply?: boolean;
        manufactureSteps?: string;
        buyToResupply?: boolean;
    }): Promise<Warehouse> {
        // Check for duplicate name
        const existing = await this.prisma.warehouse.findFirst({
            where: { name: data.name }
        });

        if (existing) {
            throw new AppError('WAREHOUSE_DUPLICATE', { name: data.name });
        }

        // Check for duplicate shortName
        if (data.shortName) {
            const existingShortName = await this.prisma.warehouse.findFirst({
                where: { shortName: data.shortName }
            });
            if (existingShortName) {
                throw new ConflictException(`A warehouse with short name '${data.shortName}' already exists`);
            }
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Create View Location (Root)
            const viewLocation = await tx.location.create({
                data: {
                    name: data.name,
                    type: 'VIEW',
                    structuralType: 'WAREHOUSE',
                }
            });

            // 2. Create Stock Location (Default storage)
            const stockLocation = await tx.location.create({
                data: {
                    name: 'Stock',
                    parentId: viewLocation.id,
                    type: 'INTERNAL',
                }
            });

            // 3. Create Warehouse linked to View Location
            const warehouse = await tx.warehouse.create({
                data: {
                    ...data,
                    location: JSON.stringify(data.location),
                    viewLocationId: viewLocation.id,
                },
            });

            // 4. Link Locations back to Warehouse
            await tx.location.update({
                where: { id: viewLocation.id },
                data: { warehouseId: warehouse.id },
            });

            await tx.location.update({
                where: { id: stockLocation.id },
                data: { warehouseId: warehouse.id },
            });

            // 5. **NEW**: Auto-Create Functional Areas and Linked Locations
            const requiredAreaTypes = getRequiredAreaTypes({
                incomingSteps: data.incomingSteps as any,
                outgoingSteps: data.outgoingSteps as any,
            });

            console.log(`✨ Creating functional areas for warehouse ${data.name}:`, requiredAreaTypes);

            for (const [index, areaType] of requiredAreaTypes.entries()) {
                // Create INTERNAL location for this functional area
                const areaLocation = await tx.location.create({
                    data: {
                        name: AREA_TYPE_LABELS[areaType] || areaType,
                        parentId: viewLocation.id,
                        type: 'INTERNAL',
                        warehouseId: warehouse.id,
                        structuralType: 'ROOM', // Functional areas are room-level
                        zonePriority: areaType === 'STORAGE' ? 50 : 100, // Storage gets medium priority
                        putawaySequence: index,
                    }
                });

                // Create WarehouseFunctionalArea linked to the location
                await tx.warehouseFunctionalArea.create({
                    data: {
                        warehouseId: warehouse.id,
                        name: AREA_TYPE_LABELS[areaType] || areaType,
                        areaType: areaType,
                        linkedLocationId: areaLocation.id,
                        sequence: index,
                        active: true,
                        x: 100 + index * 220, // Basic layout positioning
                        y: 100,
                        width: 200,
                        height: 150,
                        rotation: 0,
                    }
                });

                console.log(`  ✓ Created ${areaType} area with location: ${areaLocation.name}`);
            }

            // 6. Generate Routes based on configuration (legacy support)

            // Helper to create a route and its rules
            const createRouteWithRules = async (name: string, rules: any[]) => {
                const route = await tx.route.create({
                    data: { name: `${data.shortName}: ${name}` }
                });

                for (const [index, rule] of rules.entries()) {
                    await tx.rule.create({
                        data: {
                            routeId: route.id,
                            action: rule.action, // 'PULL' or 'PUSH'
                            sourceLocationId: rule.sourceLocationId,
                            destinationLocationId: rule.destinationLocationId,
                            sequence: index,
                        }
                    });
                }
            };

            // Incoming Routes
            if (data.incomingSteps === '2_steps') {
                // Input -> Stock
                const inputLocation = await tx.location.create({
                    data: { name: 'Input', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                await createRouteWithRules('Receive in 2 steps', [
                    { action: 'PULL', sourceLocationId: null, destinationLocationId: inputLocation.id }, // Vendor -> Input (Source null implies Vendor/External)
                    { action: 'PUSH', sourceLocationId: inputLocation.id, destinationLocationId: stockLocation.id }  // Input -> Stock
                ]);
            } else if (data.incomingSteps === '3_steps') {
                // Input -> Quality -> Stock
                const inputLocation = await tx.location.create({
                    data: { name: 'Input', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                const qualityLocation = await tx.location.create({
                    data: { name: 'Quality Control', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                await createRouteWithRules('Receive in 3 steps', [
                    { action: 'PULL', sourceLocationId: null, destinationLocationId: inputLocation.id },
                    { action: 'PUSH', sourceLocationId: inputLocation.id, destinationLocationId: qualityLocation.id },
                    { action: 'PUSH', sourceLocationId: qualityLocation.id, destinationLocationId: stockLocation.id }
                ]);
            } else {
                // 1 step (Default): Vendor -> Stock
                await createRouteWithRules('Receive in 1 step', [
                    { action: 'PULL', sourceLocationId: null, destinationLocationId: stockLocation.id }
                ]);
            }

            // Outgoing Routes
            if (data.outgoingSteps === '2_steps') {
                // Stock -> Output -> Customer
                const outputLocation = await tx.location.create({
                    data: { name: 'Output', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                await createRouteWithRules('Deliver in 2 steps', [
                    { action: 'PULL', sourceLocationId: stockLocation.id, destinationLocationId: outputLocation.id },
                    { action: 'PULL', sourceLocationId: outputLocation.id, destinationLocationId: null } // Output -> Customer (Dest null implies Customer/External)
                ]);
            } else if (data.outgoingSteps === '3_steps') {
                // Stock -> Packing -> Output -> Customer
                const packingLocation = await tx.location.create({
                    data: { name: 'Packing Zone', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                const outputLocation = await tx.location.create({
                    data: { name: 'Output', parentId: viewLocation.id, type: 'INTERNAL', warehouseId: warehouse.id }
                });
                await createRouteWithRules('Deliver in 3 steps', [
                    { action: 'PULL', sourceLocationId: stockLocation.id, destinationLocationId: packingLocation.id },
                    { action: 'PULL', sourceLocationId: packingLocation.id, destinationLocationId: outputLocation.id },
                    { action: 'PULL', sourceLocationId: outputLocation.id, destinationLocationId: null }
                ]);
            } else {
                // 1 step (Default): Stock -> Customer
                await createRouteWithRules('Deliver in 1 step', [
                    { action: 'PULL', sourceLocationId: stockLocation.id, destinationLocationId: null }
                ]);
            }

            console.log(`✅ Warehouse ${data.name} created with ${requiredAreaTypes.length} functional areas`);

            return warehouse;
        });
    }

    async updateWarehouse(id: string, data: any): Promise<Warehouse> {
        const { location, ...rest } = data;
        const updateData: any = { ...rest };
        if (location) {
            updateData.location = JSON.stringify(location);
        }
        return this.prisma.warehouse.update({
            where: { id },
            data: updateData,
        });
    }

    async getWarehouses(): Promise<Warehouse[]> {
        const warehouses = await this.prisma.warehouse.findMany();
        return warehouses.map(w => {
            try {
                return {
                    ...w,
                    location: JSON.parse(w.location),
                };
            } catch (e) {
                return {
                    ...w,
                    location: w.location, // Return raw string if parse fails
                };
            }
        });
    }

    async addStock(data: { productId: string; warehouseId: string; quantity: number; locationId?: string }): Promise<ProductInventory> {
        // Legacy support: update aggregate
        const inventory = await this.prisma.productInventory.findFirst({
            where: { productId: data.productId, warehouseId: data.warehouseId },
        });

        if (inventory) {
            return this.prisma.productInventory.update({
                where: { id: inventory.id },
                data: { quantity: inventory.quantity + data.quantity },
            });
        } else {
            return this.prisma.productInventory.create({
                data: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                    quantity: data.quantity,
                    locationId: data.locationId,
                },
            });
        }
    }

    async getStock(productId: string): Promise<ProductInventory[]> {
        return this.prisma.productInventory.findMany({
            where: { productId },
            include: { warehouse: true },
        });
    }

    async getInventory(productId?: string, locationId?: string) {
        const where: any = {};
        if (productId) where.productId = productId;
        if (locationId) where.locationId = locationId;

        return this.prisma.productInventory.findMany({
            where,
            include: { product: true, warehouse: true, location: true },
        });
    }

    async addBatch(data: {
        productId: string;
        warehouseId: string;
        locationId?: string;
        quantity: number;
        costPerUnit: number;
        purchaseDate: Date;
        expiryDate?: Date;
        vendor?: string;
        batchNumber?: string; // Optional: Allow manual batch/serial number
    }): Promise<InventoryBatch> {
        const product = await this.prisma.product.findUnique({ where: { id: data.productId } });
        if (!product) throw new AppError('PRODUCT_NOT_FOUND', { productId: data.productId });

        if (product.tracking === 'serial') {
            if (data.quantity !== 1) {
                throw new AppError('SERIAL_QUANTITY_ERROR', { productId: data.productId });
            }
            if (!data.batchNumber) {
                throw new AppError('SERIAL_NUMBER_REQUIRED', { productId: data.productId });
            }
        }

        // 1. Create Batch
        const batch = await this.prisma.inventoryBatch.create({
            data: {
                batchNumber: data.batchNumber || `BATCH-${Date.now()}`,
                productId: data.productId,
                warehouseId: data.warehouseId,
                locationId: data.locationId,
                initialQuantity: data.quantity,
                currentQuantity: data.quantity,
                costPerUnit: data.costPerUnit,
                purchaseDate: data.purchaseDate || new Date(),
                expiryDate: data.expiryDate,
                status: 'Active',
                vendor: data.vendor,
            },
        });

        // 2. Calculate Weighted Average Cost
        // Formula: New Avg = ((Current Avg × Current Qty) + (New Cost × New Qty)) / (Current Qty + New Qty)

        // Get current inventory quantities
        const currentInventory = await this.prisma.productInventory.findMany({
            where: { productId: data.productId }
        });
        const currentTotalQty = currentInventory.reduce((sum, inv) => sum + inv.quantity, 0);

        let currentAvgCost = product.averageCost || 0;

        // IMPORTANT: If product.averageCost is 0 but batches exist, calculate the true average from existing batches
        // This handles products created before the average cost feature was implemented
        if (currentAvgCost === 0 && currentTotalQty > 0) {
            this.log(`[AverageCost] Product ${data.productId}: averageCost is 0 but inventory exists. Calculating from batches...`);

            const existingBatches = await this.prisma.inventoryBatch.findMany({
                where: {
                    productId: data.productId,
                    status: 'Active'
                }
            });

            if (existingBatches.length > 0) {
                const totalValue = existingBatches.reduce((sum, batch) =>
                    sum + (batch.currentQuantity * batch.costPerUnit), 0
                );
                const totalQty = existingBatches.reduce((sum, batch) =>
                    sum + batch.currentQuantity, 0
                );

                if (totalQty > 0) {
                    currentAvgCost = totalValue / totalQty;
                    this.log(`[AverageCost] Calculated from batches: ${existingBatches.length} batches, Total Value=${totalValue}, Total Qty=${totalQty}, Avg=${currentAvgCost}`);
                }
            }
        }

        const currentValue = currentTotalQty * currentAvgCost;
        const newValue = currentValue + (data.quantity * data.costPerUnit);
        const newTotalQty = currentTotalQty + data.quantity;
        const newAvgCost = newTotalQty > 0 ? newValue / newTotalQty : data.costPerUnit;

        // Round to 2 decimal places for currency (e.g., 0.6754966... → 0.68)
        const roundedAvgCost = Math.round(newAvgCost * 100) / 100;

        // Update product average cost
        await this.prisma.product.update({
            where: { id: data.productId },
            data: { averageCost: roundedAvgCost }
        });

        this.log(`[AverageCost] Product ${data.productId}: Old Avg=${currentAvgCost.toFixed(2)}, New Avg=${roundedAvgCost.toFixed(2)} (added ${data.quantity} @ ${data.costPerUnit})`);

        // 3. Update Aggregate Inventory (Legacy support)
        // Find existing inventory record for this product/warehouse/location
        const existingInventory = await this.prisma.productInventory.findFirst({
            where: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                locationId: data.locationId,
            },
        });

        if (existingInventory) {
            await this.prisma.productInventory.update({
                where: { id: existingInventory.id },
                data: { quantity: { increment: data.quantity } },
            });
        } else {
            await this.prisma.productInventory.create({
                data: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                    locationId: data.locationId,
                    quantity: data.quantity,
                },
            });
        }

        // 4. Log Transaction
        await this.prisma.stockTransaction.create({
            data: {
                productId: data.productId,
                batchId: batch.id,
                type: 'IN',
                quantity: data.quantity,
                date: new Date(),
            },
        });

        // 5. Trigger Putaway Logic
        try {
            await this.putawayService.createTasksForBatch(batch.id, data.warehouseId);
        } catch (error) {
            console.error(`[InventoryService] Failed to create putaway tasks for batch ${batch.id}:`, error);
            // Don't fail the batch creation if putaway fails
        }

        return batch;
    }

    async getBatches(productId: string): Promise<InventoryBatch[]> {
        return this.prisma.inventoryBatch.findMany({
            where: { productId },
            include: { warehouse: true, location: true },
        });
    }

    async getAllBatches(warehouseId?: string, take = 50, skip = 0) {
        const where = warehouseId ? { warehouseId } : undefined;
        const include = {
            product: { select: { name: true, sku: true, category: true } },
            location: { select: { name: true, fullAddress: true } },
            warehouse: { select: { name: true } },
            package: { select: { name: true } },
        };
        const [data, total] = await Promise.all([
            this.prisma.inventoryBatch.findMany({ where, include, orderBy: { createdAt: 'desc' }, take, skip }),
            this.prisma.inventoryBatch.count({ where }),
        ]);
        return { data, total, limit: take, offset: skip };
    }

    async getBatch(id: string) {
        const batch = await this.prisma.inventoryBatch.findUnique({
            where: { id },
            include: {
                product: { select: { id: true, name: true, sku: true, category: true } },
                location: { select: { id: true, name: true, fullAddress: true } },
                warehouse: { select: { id: true, name: true } },
            },
        });
        if (!batch) throw new NotFoundException('Batch not found');
        return batch;
    }

    private generateBarcodePngBuffer(text: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            bwipjs.toBuffer(
                { bcid: 'code128', text, scale: 3, height: 10, includetext: true, textxalign: 'center' },
                (err, png) => (err ? reject(err) : resolve(png)),
            );
        });
    }

    async getProductBarcode(id: string): Promise<Buffer> {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) throw new NotFoundException('Product not found');
        return this.generateBarcodePngBuffer(product.sku || product.id);
    }

    async getLocationBarcode(id: string): Promise<Buffer> {
        const location = await this.prisma.location.findUnique({ where: { id } });
        if (!location) throw new NotFoundException('Location not found');
        return this.generateBarcodePngBuffer(location.code || location.id);
    }

    async getBatchBarcode(id: string): Promise<Buffer> {
        const batch = await this.prisma.inventoryBatch.findUnique({ where: { id } });
        if (!batch) throw new NotFoundException('Batch not found');
        return this.generateBarcodePngBuffer(batch.batchNumber);
    }

    async getTransactions(productId: string) {
        return this.prisma.stockTransaction.findMany({
            where: { productId },
            orderBy: { date: 'desc' },
        });
    }

    async reserveBatches(allocations: { batchId: string; quantity: number }[]) {
        return this.prisma.$transaction(async (tx) => {
            for (const alloc of allocations) {
                // 1. Update InventoryBatch
                const batch = await tx.inventoryBatch.update({
                    where: { id: alloc.batchId },
                    data: { reserved: { increment: alloc.quantity } }
                });

                // 2. Update ProductInventory (Aggregate)
                // We need to find the specific ProductInventory record for this batch's location/product
                // or just update the one matching the warehouse if tracking isn't granular.
                // For now, let's update the one at the batch's location to be precise.

                // Note: If ProductInventory is just an aggregate by Warehouse, we might find multiple or one.
                // Let's rely on finding one by productId + warehouseId + locationId
                const productInv = await tx.productInventory.findFirst({
                    where: {
                        productId: batch.productId,
                        warehouseId: batch.warehouseId,
                        locationId: batch.locationId
                    }
                });

                if (productInv) {
                    await tx.productInventory.update({
                        where: { id: productInv.id },
                        data: { reserved: { increment: alloc.quantity } }
                    });
                }
            }
        });
    }

    async reserveStock(data: { orderId: string; items: { productId: string; quantity: number }[]; strategy: string; warehouseId?: string }): Promise<any> {
        const results: any[] = [];

        // Simple transaction to ensure atomicity
        await this.prisma.$transaction(async (tx) => {
            for (const item of data.items) {
                // Resolve rotation rule for this product (reads outside tx — rotation rules are stable)
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                const rule = await this.ruleResolver.resolveRule({
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    categoryId: product?.category || undefined,
                });

                const policy = rule.policy || data.strategy || 'FIFO';
                const minShelfLifeDays: number = (rule as any).minShelfLifeDays || 0;

                // Fetch InventoryBatch records to determine location eligibility and FEFO order
                const batchWhere: any = { productId: item.productId, status: 'Active', currentQuantity: { gt: 0 } };
                if (data.warehouseId) batchWhere.warehouseId = data.warehouseId;
                const batches = await tx.inventoryBatch.findMany({ where: batchWhere });

                // Filter batches by minShelfLifeDays
                const minExpiry = new Date();
                minExpiry.setDate(minExpiry.getDate() + minShelfLifeDays);
                const eligibleBatches = minShelfLifeDays > 0
                    ? batches.filter(b => !b.expiryDate || b.expiryDate >= minExpiry)
                    : batches;

                // Build location → earliest eligible batch expiry map
                const locationExpiryMap = new Map<string, Date | null>();
                for (const b of eligibleBatches) {
                    if (!b.locationId) continue;
                    const existing = locationExpiryMap.get(b.locationId);
                    if (existing === undefined || (b.expiryDate && (!existing || b.expiryDate < existing))) {
                        locationExpiryMap.set(b.locationId, b.expiryDate ?? null);
                    }
                }
                const eligibleLocationIds = new Set(locationExpiryMap.keys());

                // Fetch productInventory records
                const whereClause: any = { productId: item.productId };
                if (data.warehouseId) whereClause.warehouseId = data.warehouseId;

                let inventory = await tx.productInventory.findMany({
                    where: whereClause,
                    include: { product: true, warehouse: true },
                });

                // Filter to eligible locations when minShelfLifeDays is active
                if (minShelfLifeDays > 0 && eligibleLocationIds.size > 0) {
                    inventory = inventory.filter(inv => !inv.locationId || eligibleLocationIds.has(inv.locationId));
                } else if (minShelfLifeDays > 0 && eligibleBatches.length === 0) {
                    // No eligible batches at all — will throw insufficient stock below
                    inventory = [];
                }

                // Sort by policy
                if (policy === 'FEFO') {
                    inventory.sort((a, b) => {
                        const exA = a.locationId ? (locationExpiryMap.get(a.locationId) ?? null) : null;
                        const exB = b.locationId ? (locationExpiryMap.get(b.locationId) ?? null) : null;
                        if (exA && exB) return exA.getTime() - exB.getTime();
                        if (exA && !exB) return -1;
                        if (!exA && exB) return 1;
                        return 0;
                    });
                }

                this.log(`[ReserveStock] Product: ${item.productId}, Policy: ${policy}, MinShelfLife: ${minShelfLifeDays}, Found Inventory Records: ${inventory.length}`);
                inventory.forEach(i => this.log(` - ID: ${i.id}, LocationId: ${i.locationId}, Qty: ${i.quantity}, Reserved: ${i.reserved}`));

                let remainingQty = item.quantity;

                for (const stock of inventory) {
                    if (remainingQty <= 0) break;

                    const available = stock.quantity - stock.reserved;
                    if (available > 0) {
                        const take = Math.min(available, remainingQty);

                        // Update inventory
                        await tx.productInventory.update({
                            where: { id: stock.id },
                            data: { reserved: { increment: take } }
                        });

                        // Create reservation record
                        await tx.reservation.create({
                            data: {
                                orderId: data.orderId,
                                productId: item.productId,
                                quantity: take,
                                reservationStrategy: policy,
                            }
                        });

                        remainingQty -= take;
                    }
                }

                if (remainingQty > 0) {
                    throw new AppError('INSUFFICIENT_STOCK', { productId: item.productId, warehouseInfo: data.warehouseId ? ` in warehouse ${data.warehouseId}` : '' });
                }

            }
        });

        return results;
    }

    async getLocationsTree(warehouseId?: string) {
        const locations = await this.prisma.location.findMany({
            where: warehouseId ? { warehouseId } : {},
            orderBy: { name: 'asc' },
            include: {
                dynamicAttributes: {
                    include: { definition: true }
                }
            }
        });

        const locationMap = new Map();
        const roots: any[] = [];

        // 1. Initialize map
        locations.forEach(loc => {
            let parsedAttributes: any = {};
            try {
                parsedAttributes = loc.attributes ? JSON.parse(loc.attributes) : {};
            } catch (e) {
                // ignore
            }

            // Merge dynamic attributes
            if (loc.dynamicAttributes) {
                loc.dynamicAttributes.forEach(attr => {
                    parsedAttributes[attr.definition.name] = attr.value;
                    // Also store full object if needed for UI details
                    if (!parsedAttributes._dynamic) parsedAttributes._dynamic = [];
                    parsedAttributes._dynamic.push({
                        name: attr.definition.name,
                        type: attr.definition.type,
                        value: attr.value
                    });
                });
            }

            locationMap.set(loc.id, { ...loc, attributes: parsedAttributes, children: [] });
        });

        // 2. Build tree
        locations.forEach(loc => {
            if (loc.parentId && locationMap.has(loc.parentId)) {
                locationMap.get(loc.parentId).children.push(locationMap.get(loc.id));
            } else {
                // If no parent, or parent not found (e.g. filtered out), treat as root
                // But if we are filtering by warehouse, we should only return the warehouse view as root if possible
                // For now, just pushing to roots is fine.
                roots.push(locationMap.get(loc.id));
            }
        });

        return roots;
    }

    async getLocations(warehouseId?: string, structuralType?: string, take = 50, skip = 0) {
        try {
            const where: any = {};
            if (warehouseId) where.warehouseId = warehouseId;
            if (structuralType) where.structuralType = structuralType;

            const [data, total] = await Promise.all([
                this.prisma.location.findMany({ where, include: { warehouseView: true }, take, skip }),
                this.prisma.location.count({ where }),
            ]);
            return { data, total, limit: take, offset: skip };
        } catch (error: any) {
            console.error('[InventoryService] Error in getLocations:', error.message, error.stack);
            throw error;
        }
    }

    private static readonly VALID_STRUCTURAL_TYPES = new Set([
        'WAREHOUSE', 'ROOM', 'ZONE', 'AISLE', 'ROW', 'BAY', 'SHELF', 'POSITION', 'BIN',
    ]);

    private assertValidStructuralType(value: string) {
        if (!InventoryService.VALID_STRUCTURAL_TYPES.has(value)) {
            throw new BadRequestException(
                `Invalid structuralType "${value}". Allowed values: ${[...InventoryService.VALID_STRUCTURAL_TYPES].join(', ')}`,
            );
        }
    }

    async createLocation(data: {
        name: string;
        warehouseId?: string;
        parentId?: string;
        type?: string; // LocationType
        structuralType?: string; // WAREHOUSE, ROOM, ZONE, AISLE, ROW, BAY, SHELF, POSITION, BIN
        attributes?: any;
        removalStrategy?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        rotation?: number;
        zonePriority?: number;
        putawaySequence?: number;
        // Phase 8 Canonical Fields
        code?: string;
        innerLength?: number;
        innerWidth?: number;
        innerHeight?: number;
        maxWeightKg?: number;
    }) {
        try {
            if (data.structuralType) {
                this.assertValidStructuralType(data.structuralType);
                if (data.structuralType !== 'WAREHOUSE' && !data.parentId) {
                    // Auto-find the warehouse root location if warehouseId is provided
                    if (data.warehouseId) {
                        const rootLoc = await this.prisma.location.findFirst({
                            where: { warehouseId: data.warehouseId, structuralType: 'WAREHOUSE' }
                        });
                        if (rootLoc) {
                            data.parentId = rootLoc.id;
                        }
                        // If no root WAREHOUSE location exists, allow creation with parentId=null
                        // (the location will be anchored to the warehouse via warehouseId alone)
                    } else {
                        throw new BadRequestException(`Location of type ${data.structuralType} must have a parent.`);
                    }
                }
                if (data.parentId) {
                    await this.validateHierarchy(data.structuralType, data.parentId);
                }
            }

            // Phase 8: Auto-generate Code and FullAddress
            const code = data.code || data.name.toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 50);

            let inheritedWarehouseId = data.warehouseId;
            let fullAddress = code;
            if (data.parentId) {
                const parent = await this.prisma.location.findUnique({ where: { id: data.parentId } });
                if (parent) {
                    const parentPrefix = (parent as any).fullAddress || (parent as any).code || parent.name.toUpperCase().replace(/[^A-Z0-9]/g, '-');
                    fullAddress = `${parentPrefix}.${code}`;
                    // Inherit warehouseId if not provided
                    if (!inheritedWarehouseId) {
                        inheritedWarehouseId = parent.warehouseId || undefined;
                    }
                }
            } else if (data.structuralType === 'WAREHOUSE') {
                // Root Warehouse
                fullAddress = code;
            }

            // Check for duplicate name in the same scope (Parent or Warehouse)
            const existing = await this.prisma.location.findFirst({
                where: {
                    name: data.name,
                    parentId: data.parentId || null, // Specific parent or Root (null)
                    warehouseId: data.parentId ? undefined : inheritedWarehouseId // If root, must match warehouse
                }
            });

            if (existing) {
                this.logger.warn('DUPLICATE FOUND! Throwing ConflictException');
                throw new ConflictException(`A location with the name "${data.name}" already exists in this scope.`);
            }

            return await this.prisma.location.create({
                data: {
                    name: data.name,
                    warehouseId: inheritedWarehouseId,
                    parentId: data.parentId,
                    type: data.type || 'INTERNAL',
                    structuralType: data.structuralType,
                    attributes: data.attributes ? JSON.stringify(data.attributes) : undefined,
                    removalStrategy: data.removalStrategy,
                    x: data.x,
                    y: data.y,
                    width: data.width,
                    height: data.height,
                    rotation: data.rotation,
                    zonePriority: data.zonePriority,
                    putawaySequence: data.putawaySequence,
                    // Phase 8 Fields
                    code,
                    fullAddress,
                    innerLength: data.innerLength,
                    innerWidth: data.innerWidth,
                    innerHeight: data.innerHeight,
                    maxWeightKg: data.maxWeightKg
                } as any,
            });
        } catch (e: any) {
            this.log(`Error creating location: ${e.message}`);
            throw e;
        }
    }

    async checkLocationDependencies(id: string) {
        const errors: string[] = [];
        let blocking = false;

        // 1. Check Children
        const childrenCount = await this.prisma.location.count({
            where: { parentId: id }
        });
        if (childrenCount > 0) {
            errors.push(`${childrenCount} Child Locations`);
            blocking = true;
        }

        // 2. Check Active Inventory
        const inventoryCount = await this.prisma.productInventory.count({
            where: {
                locationId: id,
                quantity: { gt: 0 }
            }
        });
        if (inventoryCount > 0) {
            errors.push(`${inventoryCount} Inventory Records with Stock`);
            blocking = true;
        }

        // 3. Check Active Batches
        const batchCount = await this.prisma.inventoryBatch.count({
            where: {
                locationId: id,
                status: 'Active'
            }
        });
        if (batchCount > 0) {
            errors.push(`${batchCount} Active Batches`);
            blocking = true;
        }

        // 4. Check Open Tasks (Picking)
        const pickingTasks = await this.prisma.pickingTask.count({
            where: { sourceLocationId: id, status: { not: 'PICKED' } }
        });
        if (pickingTasks > 0) {
            errors.push(`${pickingTasks} Active Picking Tasks`);
            blocking = true;
        }

        // 5. Check Open Tasks (Putaway)
        const putawayTasks = await this.prisma.putawayTask.count({
            where: {
                OR: [{ sourceLocationId: id }, { destinationLocationId: id }],
                status: { not: 'COMPLETED' }
            }
        });
        if (putawayTasks > 0) {
            errors.push(`${putawayTasks} Active Putaway Tasks`);
            blocking = true;
        }

        return {
            hasDependencies: errors.length > 0,
            dependencies: errors,
            blocking
        };
    }

    async deleteLocation(id: string) {
        const check = await this.checkLocationDependencies(id);
        if (check.blocking) {
            throw new BadRequestException(`Cannot delete location: ${check.dependencies.join(', ')}`);
        }

        // Safe cleanup
        // 1. Delete empty inventory
        await this.prisma.productInventory.deleteMany({ where: { locationId: id } });

        // 2. Delete empty batches (if any remain that are not Active?)
        await this.prisma.inventoryBatch.deleteMany({ where: { locationId: id, status: { not: 'Active' } } });

        // 4. Delete Location
        return this.prisma.location.delete({
            where: { id }
        });
    }

    async updateLocation(id: string, data: {
        name?: string;
        parentId?: string | null;
        type?: string;
        structuralType?: string;
        attributes?: any;
        removalStrategy?: string;
        inventoryFrequency?: number;
        zonePriority?: number;
        putawaySequence?: number;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        rotation?: number;
        // Phase 8
        code?: string;
        innerLength?: number;
        innerWidth?: number;
        innerHeight?: number;
        maxWeightKg?: number;
    }) {
        // Validation
        const current = await this.prisma.location.findUnique({ where: { id } });
        if (!current) throw new AppError('LOCATION_NOT_FOUND', { locationId: id });

        if (data.structuralType) this.assertValidStructuralType(data.structuralType);
        const newStructuralType = data.structuralType !== undefined ? data.structuralType : current.structuralType;
        const newParentId = data.parentId !== undefined ? data.parentId : current.parentId;

        if (newStructuralType && newStructuralType !== 'WAREHOUSE' && !newParentId) {
            throw new AppError('PARENT_REQUIRED', { structuralType: newStructuralType });
        }

        if (newStructuralType && newParentId) {
            // Only validate if something changed or if we just want to be safe. 
            // Optimization: only if type or parent changed.
            if (data.structuralType || data.parentId) {
                await this.validateHierarchy(newStructuralType, newParentId);
            }
        }

        // Phase 8: Recalculate Address if needed
        let fullAddress = undefined;
        let code = data.code || (current as any).code;

        // If code changed OR parent changed, we must recalc fullAddress
        // Also if current has no fullAddress (migration fix)
        if (data.code || data.parentId !== undefined || !(current as any).fullAddress) {
            const effectiveCode = code || (data.name || current.name).toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 10);
            code = effectiveCode; // Ensure code is updated if it was missing

            if (newParentId) {
                const parent = await this.prisma.location.findUnique({ where: { id: newParentId } });
                if (parent) {
                    const parentPrefix = (parent as any).fullAddress || (parent as any).code || parent.name.toUpperCase().replace(/[^A-Z0-9]/g, '-');
                    fullAddress = `${parentPrefix}.${effectiveCode}`;
                }
            } else if (newStructuralType === 'WAREHOUSE') {
                fullAddress = effectiveCode;
            }
        }

        // Check for duplicate name if name or parent is changing
        if (data.name || data.parentId !== undefined) {
            const newName = data.name || current.name;
            const effectiveParentId = data.parentId !== undefined ? data.parentId : current.parentId;

            // If parent is present, scope is parent. If null, scope is warehouse.
            // We need warehouseId from current record if effectiveParentId is null
            const effectiveWarehouseId = effectiveParentId ? undefined : current.warehouseId;

            const existing = await this.prisma.location.findFirst({
                where: {
                    id: { not: id }, // Exclude self
                    name: newName,
                    parentId: effectiveParentId,
                    warehouseId: effectiveWarehouseId
                }
            });

            if (existing) {
                throw new ConflictException(`A location with the name "${newName}" already exists in this scope.`);
            }
        }

        return this.prisma.location.update({
            where: { id },
            data: {
                name: data.name,
                parentId: data.parentId,
                type: data.type,
                structuralType: data.structuralType,
                attributes: data.attributes ? JSON.stringify(data.attributes) : undefined,
                removalStrategy: data.removalStrategy,
                inventoryFrequency: data.inventoryFrequency,
                zonePriority: data.zonePriority !== undefined ? parseInt(data.zonePriority as any) : undefined,
                putawaySequence: data.putawaySequence !== undefined ? parseInt(data.putawaySequence as any) : undefined,
                x: data.x,
                y: data.y,
                width: data.width,
                height: data.height,
                rotation: data.rotation,
                // Phase 8
                code: code,
                fullAddress: fullAddress,
                innerLength: data.innerLength,
                innerWidth: data.innerWidth,
                innerHeight: data.innerHeight,
                maxWeightKg: data.maxWeightKg,
            } as any,
        });
    }

    private async validateHierarchy(childType: string, parentId: string) {
        const parent = await this.prisma.location.findUnique({ where: { id: parentId } });
        if (!parent) throw new AppError('PARENT_LOCATION_NOT_FOUND', { parentId });

        const parentType = parent.structuralType;
        if (!parentType) return; // If parent has no structural type, assume it's flexible (migration support)

        // Flexible but Strict Hierarchy: Define valid parent types for each child type
        // Allows skipping intermediate levels (e.g., SHELF directly under ROW)
        const validParents: { [key: string]: string[] } = {
            'ROOM': ['WAREHOUSE'],
            'ZONE': ['WAREHOUSE'], // Alias for ROOM
            'AISLE': ['ROOM', 'ZONE', 'WAREHOUSE'],
            'ROW': ['AISLE', 'ROOM', 'ZONE', 'WAREHOUSE'], // Can be under zones or directly under warehouse
            'BAY': ['ROW', 'AISLE', 'ROOM', 'ZONE'], // Can be under rows or zones
            'SHELF': ['BAY', 'ROW', 'ROOM', 'ZONE'], // Can be under bays, rows, or zones
            'POSITION': ['SHELF', 'BAY', 'ROW'], // Can be under shelves, bays, or rows
            'BIN': ['SHELF', 'BAY', 'ROW', 'POSITION'], // Alias for POSITION
        };

        const allowedParents = validParents[childType];
        if (allowedParents && !allowedParents.includes(parentType)) {
            throw new BadRequestException(`Invalid hierarchy: ${childType} must be a child of ${allowedParents.join(' or ')}. Found parent type: ${parentType}`);
        }
    }

    async getLocationDetails(id: string) {
        const location = await this.prisma.location.findUnique({
            where: { id },
            include: { parent: true }
        });
        if (!location) throw new NotFoundException('Location not found');

        // Resolve inherited properties
        const inheritedAttributes = await this.resolveProperties(location);

        let attributes = {};
        if (location.attributes) {
            if (typeof location.attributes === 'string') {
                try {
                    attributes = JSON.parse(location.attributes);
                } catch (e) {
                    // console.warn('Failed to parse attributes:', location.attributes);
                }
            } else {
                attributes = location.attributes;
            }
        }

        return {
            ...location,
            attributes,
            inheritedAttributes,
            effectiveAttributes: { ...inheritedAttributes, ...attributes }
        };
    }

    private async resolveProperties(location: any): Promise<any> {
        let current = location;
        let mergedAttributes = {};

        // Traverse up to root
        while (current && current.parentId) {
            current = await this.prisma.location.findUnique({ where: { id: current.parentId } });
            if (current && current.attributes) {
                try {
                    const attrs = JSON.parse(current.attributes);
                    // Merge attributes (Grandparent attributes come first, allowing Parent to override)
                    // Logic: { ...Grandparent, ...Parent }
                    // Since we iterate Up (Parent -> Grandparent), we accumulate:
                    // Iter 1 (Parent): { ...Parent, ...{} }
                    // Iter 2 (GP): { ...GP, ...Parent }
                    // Result: Parent overrides GP.
                    mergedAttributes = { ...attrs, ...mergedAttributes };
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
        return mergedAttributes;
    }

    async createAdjustment(data: {
        locationId: string;
        productId: string;
        countedQuantity: number;
        currentQuantity: number;
        batchId?: string;
        reason: string;
        status?: string;
    }) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const quantity = data.countedQuantity - data.currentQuantity;
                const status = data.status || 'DRAFT';

                this.log(`Creating Adjustment: ${JSON.stringify(data)}`);

                // 1. Create Adjustment Record
                const adjustment = await tx.inventoryAdjustment.create({
                    data: {
                        locationId: data.locationId,
                        productId: data.productId,
                        batchId: data.batchId,
                        countedQuantity: data.countedQuantity,
                        currentQuantity: data.currentQuantity,
                        quantity: quantity,
                        reason: data.reason,
                        status: status,
                    },
                });

                // If status is APPLIED, update inventory immediately
                if (status === 'APPLIED') {
                    await this._applyAdjustmentLogic(tx, adjustment);
                }

                return adjustment;
            });
        } catch (error: any) {
            this.log(`Error creating adjustment: ${error.message}`);
            throw error;
        }
    }

    async updateAdjustment(id: string, data: { countedQuantity?: number; locationId?: string; status?: string }) {
        return this.prisma.inventoryAdjustment.update({
            where: { id },
            data: {
                countedQuantity: data.countedQuantity,
                locationId: data.locationId,
                status: data.status,
            },
        });
    }

    async applyAdjustment(id: string, actor?: { id?: string; email?: string; companyId?: string }) {
        const result = await this.prisma.$transaction(async (tx) => {
            const adjustment = await tx.inventoryAdjustment.findUnique({ where: { id } });
            if (!adjustment) throw new AppError('ADJUSTMENT_NOT_FOUND', { adjustmentId: id });
            if (adjustment.status === 'APPLIED') throw new AppError('ADJUSTMENT_ALREADY_APPLIED', { adjustmentId: id });

            await tx.inventoryAdjustment.update({
                where: { id },
                data: { status: 'APPLIED' },
            });

            await this._applyAdjustmentLogic(tx, adjustment);
            return adjustment;
        });

        await this.auditLog.log({
            companyId: actor?.companyId,
            actorId: actor?.id,
            actorEmail: actor?.email,
            action: 'ADJUSTMENT_APPLIED',
            entity: 'Adjustment',
            entityId: id,
            before: { status: 'PENDING' },
            after: { status: 'APPLIED' },
            metadata: { productId: result.productId, quantity: result.quantity, reason: result.reason },
        });

        return result;
    }

    private async _applyAdjustmentLogic(tx: any, adjustment: any) {
        await this.validateLocationForStock(adjustment.locationId);

        // Capacity Check 
        if (adjustment.quantity > 0) {
            const { allowed, reason } = await this.utilisationService.canAccept(
                adjustment.locationId,
                adjustment.productId,
                adjustment.quantity
            );
            if (!allowed) {
                throw new BadRequestException(`Capacity Limit Reached: ${reason}`);
            }
        }

        // 1. Update Aggregate Inventory (ProductInventory)
        const inventory = await tx.productInventory.findFirst({
            where: {
                productId: adjustment.productId,
                locationId: adjustment.locationId,
            },
        });

        if (inventory) {
            await tx.productInventory.update({
                where: { id: inventory.id },
                data: { quantity: { increment: adjustment.quantity } },
            });
        } else {
            // Find warehouseId from location
            const location = await tx.location.findUnique({ where: { id: adjustment.locationId } });
            if (location && location.warehouseId) {
                await tx.productInventory.create({
                    data: {
                        productId: adjustment.productId,
                        locationId: adjustment.locationId,
                        warehouseId: location.warehouseId,
                        quantity: adjustment.quantity,
                    },
                });
            }
        }

        // 2. Update Batch Inventory (InventoryBatch) if batchId is present
        if (adjustment.batchId) {
            await tx.inventoryBatch.update({
                where: { id: adjustment.batchId },
                data: { currentQuantity: { increment: adjustment.quantity } },
            });
        }

        // 3. Log Transaction
        await tx.stockTransaction.create({
            data: {
                productId: adjustment.productId,
                batchId: adjustment.batchId,
                type: 'ADJUSTMENT',
                quantity: adjustment.quantity,
                date: new Date(),
                referenceId: adjustment.id,
            },
        });

        // 4. Update Next Inventory Date for Location
        const location = await tx.location.findUnique({ where: { id: adjustment.locationId } });
        if (location && location.inventoryFrequency > 0) {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + location.inventoryFrequency);
            await tx.location.update({
                where: { id: location.id },
                data: { nextInventoryDate: nextDate },
            });
        }
    }

    async getAdjustments(status?: string, take = 50, skip = 0) {
        const where = status ? { status } : {};
        const [data, total] = await Promise.all([
            this.prisma.inventoryAdjustment.findMany({
                where,
                include: { product: true, location: true, batch: true },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            this.prisma.inventoryAdjustment.count({ where }),
        ]);
        return { data, total, limit: take, offset: skip };
    }

    async createScrapOrder(data: {
        locationId: string;
        productId: string;
        quantity: number;
        reason: string;
    }) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Create Scrap Order
            const scrapOrder = await tx.scrapOrder.create({
                data: {
                    locationId: data.locationId,
                    productId: data.productId,
                    quantity: data.quantity,
                    maxQuantity: data.quantity,
                    // reason: data.reason,
                    // status: 'DONE',
                },
            });

            // 2. Move Stock to "Inventory Loss" (Virtual Location)
            // FIFO Strategy for Batches
            let remainingQty = data.quantity;
            const batches = await tx.inventoryBatch.findMany({
                where: {
                    productId: data.productId,
                    locationId: data.locationId,
                    status: 'Active',
                    currentQuantity: { gt: 0 },
                },
                orderBy: { purchaseDate: 'asc' },
            });

            for (const batch of batches) {
                if (remainingQty <= 0) break;

                const qtyToTake = Math.min(batch.currentQuantity, remainingQty);
                await tx.inventoryBatch.update({
                    where: { id: batch.id },
                    data: { currentQuantity: { decrement: qtyToTake } },
                });
                remainingQty -= qtyToTake;
            }

            if (remainingQty > 0) {
                throw new AppError('INSUFFICIENT_STOCK_TO_SCRAP', { productId: data.productId, locationId: data.locationId, quantity: data.quantity });
            }

            // Update Aggregate Inventory
            const inventory = await tx.productInventory.findFirst({
                where: {
                    productId: data.productId,
                    locationId: data.locationId,
                },
            });

            if (!inventory || inventory.quantity < data.quantity) {
                throw new AppError('INSUFFICIENT_STOCK_TO_SCRAP', { productId: data.productId, locationId: data.locationId, quantity: data.quantity });
            }

            await tx.productInventory.update({
                where: { id: inventory.id },
                data: { quantity: { decrement: data.quantity } },
            });

            // 3. Log Transaction
            await tx.stockTransaction.create({
                data: {
                    productId: data.productId,
                    type: 'OUT', // Treating scrap as OUT for now, or could be ADJUSTMENT
                    quantity: data.quantity,
                    date: new Date(),
                    referenceId: scrapOrder.id,
                },
            });

            return scrapOrder;
        });
    }



    async getScrapOrders() {
        return this.prisma.scrapOrder.findMany({
            include: { product: true, location: true },
            // orderBy: { createdAt: 'desc' },
        });
    }





    async moveLocation(locationId: string, newParentId: string | null) {
        // Validation: Prevent circular reference
        if (newParentId) {
            let parent = await this.prisma.location.findUnique({ where: { id: newParentId } });
            while (parent) {
                if (parent.id === locationId) {
                    throw new AppError('CANNOT_MOVE_INTO_SELF');
                }
                if (!parent.parentId) break;
                parent = await this.prisma.location.findUnique({ where: { id: parent.parentId } });
            }
        }

        return this.prisma.location.update({
            where: { id: locationId },
            data: { parentId: newParentId },
        });
    }

    async createPutawayRule(data: {
        name: string;
        description?: string;
        productId?: string;
        categoryId?: string;
        locationId?: string;
        destinationLocationId?: string;
        sourceLocationId?: string;
        strategy: string;
        priority: number;
        warehouseId?: string;
    }) {
        // Phase 4: Extract attribute IDs and create relations
        const { requiredAttributeIds, ...ruleData } = data as any;

        return this.prisma.putawayRule.create({
            data: {
                name: ruleData.name,
                description: ruleData.description,
                productId: ruleData.productId,
                categoryId: ruleData.categoryId,
                locationId: ruleData.locationId, // Legacy field
                destinationLocationId: ruleData.destinationLocationId, // Phase 2 field
                sourceLocationId: ruleData.sourceLocationId,
                strategy: ruleData.strategy,
                priority: ruleData.priority,
                warehouseId: ruleData.warehouseId,
                active: ruleData.active ?? true,
                velocityClass: ruleData.velocityClass,
                abcClass: ruleData.abcClass,
                minPackagingSize: ruleData.minPackagingSize,
                maxPackagingSize: ruleData.maxPackagingSize,
                minWeight: ruleData.minWeight,
                maxWeight: ruleData.maxWeight,
                preferredZonePriorityMin: ruleData.preferredZonePriorityMin,
                preferredZonePriorityMax: ruleData.preferredZonePriorityMax,
                // Create attribute relations
                requiredAttributes: {
                    create: requiredAttributeIds?.map((attrId: string) => ({
                        attributeDefinitionId: attrId
                    })) || []
                }
            },
            include: {
                requiredAttributes: {
                    include: {
                        attributeDefinition: true
                    }
                }
            }
        });
    }

    async getPutawayRules() {
        return this.prisma.putawayRule.findMany({
            include: {
                product: true,
                location: true,
                sourceLocation: true,
                destinationLocation: true,
                warehouse: true,
            },
            orderBy: { priority: 'desc' },
        });
    }

    async updatePutawayRule(id: string, data: any) {
        return this.prisma.putawayRule.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                productId: data.productId,
                categoryId: data.categoryId,
                velocityClass: data.velocityClass,
                abcClass: data.abcClass,
                // requiredAttributes: removed - now use PutawayRuleAttribute relation
                // temperatureMin/Max: removed from schema
                minPackagingSize: data.minPackagingSize,
                maxPackagingSize: data.maxPackagingSize,
                minWeight: data.minWeight,
                maxWeight: data.maxWeight,
                sourceLocationId: data.sourceLocationId,
                strategy: data.strategy,
                destinationLocationId: data.destinationLocationId,
                preferredZonePriorityMin: data.preferredZonePriorityMin,
                preferredZonePriorityMax: data.preferredZonePriorityMax,
                warehouseId: data.warehouseId,
                priority: data.priority,
                active: data.active,
            },
        });
    }

    async deletePutawayRule(id: string) {
        return this.prisma.putawayRule.delete({
            where: { id },
        });
    }

    // Phase 4: Get all attribute definitions for frontend forms
    async getAttributeDefinitions() {
        return this.prisma.locationAttributeDefinition.findMany({
            orderBy: { name: 'asc' }
        });
    }

    async testPutawayRule(data: {
        productId: string;
        quantity: number;
        warehouseId: string;
        sourceLocationId?: string;
        packagingType?: string;
    }) {
        // Import PutawayService to use findBestLocation
        const utilisationService = new (await import('./utilisation.service')).UtilisationService(this.prisma);
        const putawayService = new (await import('./putaway.service')).PutawayService(this.prisma, utilisationService);

        const bestLocation = await putawayService.findBestLocation(
            data.productId,
            data.quantity,
            data.warehouseId,
            data.sourceLocationId,
            data.packagingType
        );

        // Get product details
        const product = await this.prisma.product.findUnique({
            where: { id: data.productId },
        });

        // Get matching rules for context
        const matchingRules = await this.prisma.putawayRule.findMany({
            where: {
                active: true,
                OR: [
                    { warehouseId: data.warehouseId },
                    { warehouseId: null as any },
                ],
                AND: [
                    {
                        OR: [
                            { productId: data.productId },
                            { categoryId: product?.category },
                            { velocityClass: product?.velocity },
                            { abcClass: product?.abcClass },
                            { AND: [{ productId: null }, { categoryId: null }] },
                        ],
                    }
                ],
            },
            orderBy: { priority: 'desc' },
            take: 5, // Top 5 matching rules
        });

        return {
            selectedLocation: bestLocation,
            product,
            matchingRules,
            testParameters: data,
        };
    }


    async applyPutawayStrategy(productId: string, currentLocationId?: string, quantity?: number): Promise<string | null> {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product) return null;

        const rules = await this.prisma.putawayRule.findMany({
            where: {
                active: true,
                AND: [
                    {
                        OR: [
                            { productId: productId },
                            { categoryId: product.category || '' }
                        ]
                    },
                    {
                        OR: [
                            { sourceLocationId: currentLocationId || undefined },
                            { sourceLocationId: null }
                        ]
                    }
                ]
            },
            orderBy: { priority: 'desc' }
        });

        // Sort by specificity: Source Location > Product > Category
        rules.sort((a, b) => {
            // 1. Source Location Specificity (Specific > Global)
            const aSource = a.sourceLocationId ? 1 : 0;
            const bSource = b.sourceLocationId ? 1 : 0;
            if (aSource !== bSource) return bSource - aSource;

            // 2. Product Specificity (Product > Category)
            const aProduct = a.productId ? 1 : 0;
            const bProduct = b.productId ? 1 : 0;
            if (aProduct !== bProduct) return bProduct - aProduct;

            // 3. Priority
            return b.priority - a.priority;
        });

        if (rules.length > 0) {
            return rules[0].locationId;
        }

        // If no explicit rules, try Velocity-based Logic (Golden Zone)
        // We need a warehouse context. Derive from currentLocationId.
        if (currentLocationId && quantity) {
            try {
                const location = await this.prisma.location.findUnique({ where: { id: currentLocationId } });
                if (location && location.warehouseId) {
                    const bestLocation = await this.putawayService.findBestLocation(productId, quantity, location.warehouseId);
                    if (bestLocation) {
                        return bestLocation.id;
                    }
                }
            } catch (e: any) {
                console.error('Putaway Logic Error:', e);
            }
        }

        return null;
    }

    async suggestRemoval(locationId: string, productId: string, quantity: number) {
        const location = await this.prisma.location.findUnique({ where: { id: locationId } });
        if (!location) throw new AppError('LOCATION_NOT_FOUND', { locationId });

        const strategy = location.removalStrategy || 'FIFO'; // Default to FIFO

        let orderBy: any = { purchaseDate: 'asc' }; // FIFO
        if (strategy === 'LIFO') orderBy = { purchaseDate: 'desc' };
        if (strategy === 'FEFO') orderBy = { expiryDate: 'asc' };

        const batches = await this.prisma.inventoryBatch.findMany({
            where: {
                locationId: locationId,
                productId: productId,
                currentQuantity: { gt: 0 },
                status: 'Active',
            },
            orderBy: orderBy,
        });

        // Simple allocation logic
        const suggestions = [];
        let remaining = quantity;
        for (const batch of batches) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, batch.currentQuantity);
            suggestions.push({ batchId: batch.id, quantity: take });
            remaining -= take;
        }

        return suggestions;
    }

    async createPackage(data: { name: string; type: string; locationId?: string; packagingId?: string }) {
        return this.prisma.package.create({
            data: {
                name: data.name,
                type: data.type,
                locationId: data.locationId,
                packagingId: data.packagingId
            },
        });
    }

    async getPackages() {
        return this.prisma.package.findMany({
            include: { location: true, batches: { include: { product: true } } },
        });
    }

    async assignBatchToPackage(batchId: string, packageId: string) {
        return this.prisma.inventoryBatch.update({
            where: { id: batchId },
            data: { packageId },
        });
    }

    async createRoute(data: { name: string; description?: string }) {
        return this.prisma.route.create({
            data: {
                name: data.name,
                description: data.description,
            },
        });
    }

    async getRoutes() {
        return this.prisma.route.findMany({
            include: { rules: true },
        });
    }

    async deleteRoute(id: string) {
        await this.prisma.rule.deleteMany({ where: { routeId: id } });
        return this.prisma.route.delete({ where: { id } });
    }

    async createRule(data: { routeId: string; action: string; sourceLocationId?: string; destinationLocationId?: string; sequence?: number }) {
        return this.prisma.rule.create({
            data: {
                routeId: data.routeId,
                action: data.action,
                sourceLocationId: data.sourceLocationId,
                destinationLocationId: data.destinationLocationId,
                sequence: data.sequence,
            },
        });
    }

    async updateRule(id: string, data: { action?: string; sourceLocationId?: string; destinationLocationId?: string; sequence?: number }) {
        return this.prisma.rule.update({
            where: { id },
            data: {
                action: data.action,
                sourceLocationId: data.sourceLocationId,
                destinationLocationId: data.destinationLocationId,
                sequence: data.sequence,
            },
        });
    }

    async createTransfer(data: { productId: string; sourceLocationId: string; destinationLocationId: string; quantity: number; reason?: string }) {
        try {
            await this.validateLocationForStock(data.destinationLocationId);

            // Capacity Check
            const { allowed, reason } = await this.utilisationService.canAccept(
                data.destinationLocationId,
                data.productId,
                data.quantity
            );

            if (!allowed) {
                throw new BadRequestException(`Capacity Limit Reached: ${reason}`);
            }

            return await this.prisma.$transaction(async (tx) => {
                // 1. Decrement source
                const sourceBatch = await tx.inventoryBatch.findFirst({
                    where: {
                        productId: data.productId,
                        locationId: data.sourceLocationId,
                        currentQuantity: { gte: data.quantity },
                        status: 'Active',
                    },
                    orderBy: { purchaseDate: 'asc' }, // FIFO by default for now
                });

                if (!sourceBatch) {
                    throw new BadRequestException('Insufficient stock in source location');
                }

                await tx.inventoryBatch.update({
                    where: { id: sourceBatch.id },
                    data: { currentQuantity: { decrement: data.quantity } },
                });

                // 2. Increment destination
                const destBatch = await tx.inventoryBatch.findFirst({
                    where: {
                        productId: data.productId,
                        locationId: data.destinationLocationId,
                        batchNumber: sourceBatch.batchNumber,
                        status: 'Active'
                    }
                });

                if (destBatch) {
                    await tx.inventoryBatch.update({
                        where: { id: destBatch.id },
                        data: { currentQuantity: { increment: data.quantity } }
                    });
                } else {
                    // If moving across warehouses, we should check destination warehouse logic
                    // For now assuming same warehouse concept or inheriting properties
                    const destLoc = await tx.location.findUnique({ where: { id: data.destinationLocationId } });

                    // Generate unique batch number if splitting
                    const newBatchNumber = `${sourceBatch.batchNumber}-T${Date.now().toString().slice(-6)}`;

                    await tx.inventoryBatch.create({
                        data: {
                            productId: data.productId,
                            locationId: data.destinationLocationId,
                            warehouseId: destLoc?.warehouseId || sourceBatch.warehouseId,
                            batchNumber: newBatchNumber,
                            initialQuantity: data.quantity,
                            currentQuantity: data.quantity,
                            costPerUnit: sourceBatch.costPerUnit,
                            purchaseDate: sourceBatch.purchaseDate,
                            expiryDate: sourceBatch.expiryDate,
                            status: 'Active',
                            vendor: sourceBatch.vendor
                        }
                    });
                }

                // 3. Log transaction
                await tx.stockTransaction.create({
                    data: {
                        productId: data.productId,
                        quantity: data.quantity,
                        type: 'TRANSFER',
                        // locationId: data.destinationLocationId, 
                        // reason: data.reason || 'Internal Transfer',
                    },
                });

                return { success: true };
            });
        } catch (error: any) {
            console.error('CreateTransfer Error:', error);
            if (error instanceof BadRequestException) throw error;
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException(`Transfer Failed: ${error.message}`);
        }
    }

    // Reordering Rules
    async createReorderingRule(data: { productId: string; locationId: string; minQuantity: number; maxQuantity: number }) {
        return this.prisma.reorderingRule.create({
            data: {
                productId: data.productId,
                locationId: data.locationId,
                minQuantity: data.minQuantity,
                maxQuantity: data.maxQuantity,
            },
        });
    }

    async getReorderingRules() {
        return this.prisma.reorderingRule.findMany({
            include: { product: true, location: true },
        });
    }

    async checkReorderingRules() {
        const rules = await this.prisma.reorderingRule.findMany({
            where: { active: true },
            include: { product: true, location: true },
        });

        const suggestions = [];

        for (const rule of rules) {
            // Calculate current stock at location
            const stock = await this.prisma.inventoryBatch.aggregate({
                where: {
                    productId: rule.productId,
                    locationId: rule.locationId,
                    status: 'Active',
                },
                _sum: { currentQuantity: true },
            });

            const currentQty = stock._sum.currentQuantity || 0;

            if (currentQty < rule.minQuantity) {
                suggestions.push({
                    ruleId: rule.id,
                    product: rule.product,
                    location: rule.location,
                    currentQuantity: currentQty,
                    minQuantity: rule.minQuantity,
                    maxQuantity: rule.maxQuantity,
                    suggestedOrder: rule.maxQuantity - currentQty,
                });
            }
        }

        return suggestions;
    }

    // Reporting & Valuation
    async getValuation() {
        const batches = await this.prisma.inventoryBatch.findMany({
            where: {
                currentQuantity: { gt: 0 },
            },
            include: {
                product: true,
                location: true,
            },
        });

        // Group by Product
        const valuationByProduct: Record<string, any> = {};
        let totalValue = 0;

        for (const batch of batches) {
            const value = batch.currentQuantity * batch.costPerUnit;
            totalValue += value;

            if (!valuationByProduct[batch.productId]) {
                valuationByProduct[batch.productId] = {
                    productId: batch.productId,
                    productName: batch.product.name,
                    sku: batch.product.sku,
                    totalQuantity: 0,
                    totalValue: 0,
                    batches: [],
                };
            }

            valuationByProduct[batch.productId].totalQuantity += batch.currentQuantity;
            valuationByProduct[batch.productId].totalValue += value;
            valuationByProduct[batch.productId].batches.push({
                batchNumber: batch.batchNumber,
                quantity: batch.currentQuantity,
                cost: batch.costPerUnit,
                value: value,
                location: batch.location?.name || 'Unknown',
            });
        }

        return {
            totalValue,
            products: Object.values(valuationByProduct),
        };
    }

    async getStockTransactions(take = 50, skip = 0) {
        const [data, total] = await Promise.all([
            this.prisma.stockTransaction.findMany({
                orderBy: { date: 'desc' },
                include: { product: true },
                take,
                skip,
            }),
            this.prisma.stockTransaction.count(),
        ]);
        return { data, total, limit: take, offset: skip };
    }

    async checkCycleCounts() {
        const today = new Date();
        const locations = await this.prisma.location.findMany({
            where: {
                nextInventoryDate: { lte: today },
                inventoryFrequency: { gt: 0 },
            },
            include: {
                warehouseView: true,
            },
        });
        return locations;
    }

    async getTransitItems() {
        return this.prisma.inventoryBatch.findMany({
            where: {
                location: {
                    type: 'TRANSIT',
                },
                currentQuantity: { gt: 0 },
            },
            include: {
                product: true,
                location: true,
                warehouse: true,
            },
        });
    }

    async createCycleCountAdjustments(locationIds: string[]) {
        const adjustments = [];

        for (const locationId of locationIds) {
            // Find all batches in this location
            const batches = await this.prisma.inventoryBatch.findMany({
                where: { locationId, currentQuantity: { gt: 0 } },
            });

            // Create a draft adjustment for each batch
            for (const batch of batches) {
                const adjustment = await this.createAdjustment({
                    locationId,
                    productId: batch.productId,
                    batchId: batch.id,
                    currentQuantity: batch.currentQuantity,
                    countedQuantity: batch.currentQuantity, // Default to current
                    reason: 'Cycle Count',
                    status: 'DRAFT',
                });
                adjustments.push(adjustment);
            }

            // If location is empty, we might want to create an empty adjustment for a product? 
            // Odoo typically creates lines for what's there. 
            // If the user finds something new, they add it manually in the sheet.
        }

        return adjustments;
    }

    private async validateLocationForStock(locationId: string) {
        // @ts-ignore
        const location = await this.prisma.location.findUnique({ where: { id: locationId } });
        if (!location) throw new AppError('LOCATION_NOT_FOUND', { locationId });
        if (location.type === 'VIEW') {
            throw new AppError('CANNOT_STORE_IN_VIEW', { locationName: location.name });
        }
    }
    async checkProcurement(productId: string, quantity: number, locationId: string, tx: any) {
        // Find Pull Rules for this location (e.g. "To fulfill Stock, Pull from Vendor")
        const pullRules = await tx.rule.findMany({
            where: {
                destinationLocationId: locationId,
                action: 'PULL',
            },
            orderBy: { sequence: 'asc' }
        });

        for (const rule of pullRules) {
            if (rule.sourceLocationId) {
                // Create a move: Source -> Destination (This location)
                await this.createStockMove({
                    productId,
                    quantity,
                    sourceLocationId: rule.sourceLocationId,
                    destinationLocationId: locationId,
                    ruleId: rule.id,
                    origin: 'PROCUREMENT',
                    status: 'WAITING',
                }, tx);

                // Recursive: Check if Source now needs replenishment
                await this.checkProcurement(productId, quantity, rule.sourceLocationId, tx);
            }
        }
    }

    async createStockMove(data: {
        productId: string;
        quantity: number;
        sourceLocationId?: string;
        destinationLocationId?: string;
        ruleId?: string;
        origin?: string;
        batchId?: string;
        status?: string;
    }, tx?: any) {
        const prisma = tx || this.prisma;

        let finalDestinationId = data.destinationLocationId;

        // Apply Putaway Strategy (Redirects)
        if (data.destinationLocationId) {
            const redirectId = await this.applyPutawayStrategy(data.productId, data.destinationLocationId, data.quantity);
            if (redirectId) finalDestinationId = redirectId;
        }

        const move = await prisma.stockMove.create({
            data: {
                productId: data.productId,
                quantity: data.quantity,
                sourceLocationId: data.sourceLocationId,
                destinationLocationId: finalDestinationId,
                ruleId: data.ruleId,
                origin: data.origin,
                batchId: data.batchId,
                status: data.status || 'DRAFT',
            },
        });

        // Trigger Procurement (PULL) logic
        // If we are blocking stock at Source, we might need a PULL rule to replenish it.
        // E.g. Sales Order blocks stock at Output.
        if (move.sourceLocationId) {
            await this.checkProcurement(move.productId, move.quantity, move.sourceLocationId, prisma);
        }

        return move;
    }

    async getStockMoves(status?: string, take = 50, skip = 0) {
        const where = status ? { status } : {};
        const [data, total] = await Promise.all([
            this.prisma.stockMove.findMany({
                where,
                include: { product: true, sourceLocation: true, destinationLocation: true, rule: true },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            this.prisma.stockMove.count({ where }),
        ]);
        return { data, total, limit: take, offset: skip };
    }

    async validateStockMove(id: string) {
        return this.prisma.$transaction(async (tx) => {
            const move = await tx.stockMove.findUnique({ where: { id } });
            if (!move) throw new AppError('STOCK_MOVE_NOT_FOUND', { moveId: id });
            if (move.status === 'DONE') throw new AppError('STOCK_MOVE_ALREADY_DONE', { moveId: id });

            // Capacity Check (if moving to a destination)
            if (move.destinationLocationId) {
                // console.log(`[InventoryService] Validating Move ${id} - Checking Capacity for Loc ${move.destinationLocationId}`);
                const { allowed, reason } = await this.utilisationService.canAccept(
                    move.destinationLocationId,
                    move.productId,
                    move.quantity
                );
                // console.log(`[InventoryService] Capacity Check Result: allowed=${allowed}, reason=${reason}`);

                if (!allowed) {
                    throw new BadRequestException(`Capacity Limit Reached: ${reason}`);
                }
            }

            // 1. Execute the Move (Update Inventory)
            if (move.sourceLocationId && move.destinationLocationId) {
                // Decrement Source
                const sourceBatch = await tx.inventoryBatch.findFirst({
                    where: {
                        productId: move.productId,
                        locationId: move.sourceLocationId,
                        currentQuantity: { gte: move.quantity },
                        status: 'Active',
                    },
                    orderBy: { purchaseDate: 'asc' },
                });

                if (sourceBatch) {
                    await tx.inventoryBatch.update({
                        where: { id: sourceBatch.id },
                        data: { currentQuantity: { decrement: move.quantity } },
                    });
                }

                // Increment Destination
                const destLocation = await tx.location.findUnique({ where: { id: move.destinationLocationId } });
                console.log('Validate Move Debug:', {
                    destLocationId: move.destinationLocationId,
                    foundDestLocation: destLocation,
                    warehouseId: destLocation?.warehouseId
                });

                if (destLocation && destLocation.warehouseId) {
                    if (move.batchId) {
                        // Move specific batch logic could go here
                    } else {
                        // Create new batch representing this move
                        await tx.inventoryBatch.create({
                            data: {
                                productId: move.productId,
                                locationId: move.destinationLocationId,
                                warehouseId: destLocation.warehouseId,
                                initialQuantity: move.quantity,
                                currentQuantity: move.quantity,
                                costPerUnit: sourceBatch ? sourceBatch.costPerUnit : 0,
                                purchaseDate: sourceBatch ? sourceBatch.purchaseDate : new Date(),
                                status: 'Active',
                                batchNumber: `MOVE - ${Date.now()} `
                            }
                        });
                    }

                    // Update Destination Aggregate Inventory
                    const destInventory = await tx.productInventory.findFirst({
                        where: {
                            productId: move.productId,
                            locationId: move.destinationLocationId,
                        },
                    });

                    if (destInventory) {
                        await tx.productInventory.update({
                            where: { id: destInventory.id },
                            data: { quantity: { increment: move.quantity } },
                        });
                    } else {
                        await tx.productInventory.create({
                            data: {
                                productId: move.productId,
                                locationId: move.destinationLocationId,
                                warehouseId: destLocation.warehouseId,
                                quantity: move.quantity,
                            },
                        });
                    }
                }
            } else if (!move.sourceLocationId && move.destinationLocationId) {
                // Receipt (Vendor -> Stock)
                const destLocation = await tx.location.findUnique({ where: { id: move.destinationLocationId } });
                if (destLocation && destLocation.warehouseId) {
                    await tx.inventoryBatch.create({
                        data: {
                            productId: move.productId,
                            locationId: move.destinationLocationId,
                            warehouseId: destLocation.warehouseId,
                            initialQuantity: move.quantity,
                            currentQuantity: move.quantity,
                            costPerUnit: 0, // Needs to be updated from PO
                            purchaseDate: new Date(),
                            status: 'Active',
                            batchNumber: `REC - ${Date.now()} `
                        }
                    });

                    // Update Destination Aggregate Inventory
                    const destInventory = await tx.productInventory.findFirst({
                        where: {
                            productId: move.productId,
                            locationId: move.destinationLocationId,
                        },
                    });

                    if (destInventory) {
                        await tx.productInventory.update({
                            where: { id: destInventory.id },
                            data: { quantity: { increment: move.quantity } },
                        });
                    } else {
                        await tx.productInventory.create({
                            data: {
                                productId: move.productId,
                                locationId: move.destinationLocationId,
                                warehouseId: destLocation.warehouseId,
                                quantity: move.quantity,
                            },
                        });
                    }
                }
            } else if (move.sourceLocationId && !move.destinationLocationId) {
                // Delivery (Stock -> Customer)
                const sourceBatch = await tx.inventoryBatch.findFirst({
                    where: {
                        productId: move.productId,
                        locationId: move.sourceLocationId,
                        currentQuantity: { gte: move.quantity },
                        status: 'Active',
                    },
                    orderBy: { purchaseDate: 'asc' },
                });
                if (sourceBatch) {
                    await tx.inventoryBatch.update({
                        where: { id: sourceBatch.id },
                        data: { currentQuantity: { decrement: move.quantity } },
                    });
                }

                // Decrement Source Aggregate Inventory
                await tx.productInventory.updateMany({
                    where: {
                        productId: move.productId,
                        locationId: move.sourceLocationId,
                    },
                    data: { quantity: { decrement: move.quantity } },
                });
            }

            // 2. Update Move Status
            const updatedMove = await tx.stockMove.update({
                where: { id },
                data: { status: 'DONE' },
            });

            // 3. PUSH Logic (Downstream)
            if (move.destinationLocationId) {
                const pushRules = await tx.rule.findMany({
                    where: {
                        sourceLocationId: move.destinationLocationId,
                        action: 'PUSH',
                    },
                    orderBy: { sequence: 'asc' }
                });

                for (const rule of pushRules) {
                    await tx.stockMove.create({
                        data: {
                            productId: move.productId,
                            quantity: move.quantity,
                            sourceLocationId: move.destinationLocationId,
                            destinationLocationId: rule.destinationLocationId,
                            ruleId: rule.id,
                            origin: move.origin,
                            status: 'WAITING',
                        }
                    });
                }
            }

            return updatedMove;
        });
    }
    // --- Product Packaging ---

    async createProductPackaging(data: {
        name: string;
        type: string;
        productId: string;
        quantity: number;
        width?: number;
        height?: number;
        depth?: number;
        weight?: number;
        barcode?: number;
    }) {
        return this.prisma.productPackaging.create({
            data: {
                ...data,
                barcode: data.barcode ? data.barcode.toString() : undefined
            }
        });
    }

    async getProductPackaging(productId: string) {
        return this.prisma.productPackaging.findMany({
            where: { productId }
        });
    }
    async findPutawayLocation(warehouseId: string, productId: string, packagingId?: string): Promise<any> {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        let packaging = null;
        if (packagingId) {
            packaging = await this.prisma.productPackaging.findUnique({ where: { id: packagingId } });
        }

        const locations = await this.prisma.location.findMany({
            where: {
                warehouseId,
                type: 'INTERNAL',
                structuralType: { in: ['SHELF', 'BAY', 'POSITION', 'ROOM'] } // Only storage locations
            }
        });

        // Filter candidates
        const candidates = locations.filter(loc => {
            // 1. Check Packaging Support
            if (packaging && loc.supportedPackaging) {
                const supported = JSON.parse(loc.supportedPackaging);
                if (Array.isArray(supported) && !supported.includes(packaging.unitType)) {
                    return false;
                }
            }

            // 2. Check Storage Requirements
            if (packaging && packaging.storageRequirements) {
                const reqs = JSON.parse(packaging.storageRequirements);
                const attrs = loc.attributes ? JSON.parse(loc.attributes) : {};

                // Check if all requirements are met
                // Example: reqs=["refrigerated"], attrs={"refrigerated": true}
                for (const req of reqs) {
                    if (!attrs[req]) return false;
                }
            }

            return true;
        });

        // Sort candidates (Simple heuristic: locations with same product first, then empty)
        // For now, just return the first valid one
        return candidates.length > 0 ? candidates[0] : null;
    }
}
