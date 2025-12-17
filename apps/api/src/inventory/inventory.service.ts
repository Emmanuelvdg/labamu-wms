import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Product, Warehouse, ProductInventory, InventoryBatch } from '@labamu/database';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InventoryService {
    private log(message: string) {
        const logPath = 'c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\debug_reservation.log';
        fs.appendFileSync(logPath, `[InventoryService] ${message}\n`);
    }

    constructor(private prisma: PrismaService) { }

    async createProduct(data: any): Promise<Product> {
        return this.prisma.product.create({
            data: {
                sku: data.sku,
                name: data.name,
                category: data.category,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
                classification: data.classification,
                type: data.type,
                unitOfMeasure: data.unitOfMeasure,
                averageCost: data.averageCost,
                status: data.status,
                tracking: data.tracking || 'none',
            },
        });
    }

    async createSupplier(data: { name: string; contactInfo?: string }) {
        return this.prisma.supplier.create({
            data: {
                name: data.name,
                contactInfo: data.contactInfo,
            },
        });
    }

    async getProducts(filters?: {
        search?: string;
        category?: string;
        classification?: string;
        warehouseId?: string;
    }): Promise<Product[]> {
        const where: any = {};

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search } }, // Case-insensitive by default in SQLite? No, usually need mode: 'insensitive' but let's check DB type. It's SQLite.
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
                    quantity: { gt: 0 } // Only show products with stock in that warehouse? Or just any record? Let's say any record for now, or maybe > 0.
                }
            };
        }

        return this.prisma.product.findMany({ where });
    }

    async getProduct(id: string): Promise<Product | null> {
        return this.prisma.product.findUnique({ where: { id } });
    }

    async createWarehouse(data: {
        name: string;
        shortName: string;
        address: string;
        companyId: string;
        location: any;
        type: string;
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
            throw new Error('Warehouse with this name already exists');
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

            // 5. Generate Routes based on configuration

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

    async getInventory(productId?: string) {
        const where = productId ? { productId } : {};
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
        if (!product) throw new Error('Product not found');

        if (product.tracking === 'serial') {
            if (data.quantity !== 1) {
                throw new Error('Serial tracked products must be added one by one (quantity 1)');
            }
            if (!data.batchNumber) {
                throw new Error('Serial number is required for serial tracked products');
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
                purchaseDate: data.purchaseDate,
                expiryDate: data.expiryDate,
                status: 'Active',
                vendor: data.vendor,
            },
        });

        // 2. Update Aggregate Inventory (Legacy support)
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

        // 3. Log Transaction
        await this.prisma.stockTransaction.create({
            data: {
                productId: data.productId,
                batchId: batch.id,
                type: 'IN',
                quantity: data.quantity,
                date: new Date(),
            },
        });

        return batch;
    }

    async getBatches(productId: string): Promise<InventoryBatch[]> {
        return this.prisma.inventoryBatch.findMany({
            where: { productId },
            include: { warehouse: true, location: true },
        });
    }

    async getTransactions(productId: string) {
        return this.prisma.stockTransaction.findMany({
            where: { productId },
            orderBy: { date: 'desc' },
        });
    }

    async reserveStock(data: { orderId: string; items: { productId: string; quantity: number }[]; strategy: string }): Promise<any> {
        const results = [];

        // Simple transaction to ensure atomicity
        await this.prisma.$transaction(async (tx) => {
            for (const item of data.items) {
                // Fetch available inventory
                const inventory = await tx.productInventory.findMany({
                    where: { productId: item.productId },
                    include: { product: true, warehouse: true },
                    orderBy: data.strategy === 'FEFO'
                        ? { product: { expiryDate: 'asc' } }
                        : { warehouse: { id: 'asc' } } // Default to location/FIFO (mock logic for now)
                });

                this.log(`[ReserveStock] Product: ${item.productId}, Qty: ${item.quantity}, Found Inventory Records: ${inventory.length}`);
                inventory.forEach(i => this.log(` - ID: ${i.id}, Qty: ${i.quantity}, Reserved: ${i.reserved}, Warehouse: ${i.warehouseId}`));

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
                                reservationStrategy: data.strategy,
                            }
                        });

                        remainingQty -= take;
                    }
                }

                if (remainingQty > 0) {
                    throw new Error(`Insufficient stock for product ${item.productId}`);
                }

            }
        });

        return results;
    }

    async getLocationsTree(warehouseId?: string) {
        const locations = await this.prisma.location.findMany({
            where: warehouseId ? { warehouseId } : {},
            orderBy: { name: 'asc' }
        });

        const locationMap = new Map();
        const roots: any[] = [];

        // 1. Initialize map
        locations.forEach(loc => {
            let parsedAttributes = {};
            try {
                parsedAttributes = loc.attributes ? JSON.parse(loc.attributes) : {};
            } catch (e) {
                // ignore
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

    async getLocations(warehouseId?: string) {
        const where = warehouseId ? { warehouseId } : {};
        return this.prisma.location.findMany({
            where,
            include: { warehouseView: true },
        });
    }

    async createLocation(data: {
        name: string;
        warehouseId?: string;
        parentId?: string;
        type?: string; // LocationType
        structuralType?: string; // WAREHOUSE, ROOM, ROW, BAY, SHELF, POSITION
        attributes?: any;
        removalStrategy?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        rotation?: number;
    }) {
        try {
            if (data.structuralType) {
                if (data.structuralType !== 'WAREHOUSE' && !data.parentId) {
                    throw new Error(`Location of type ${data.structuralType} must have a parent.`);
                }
                if (data.parentId) {
                    await this.validateHierarchy(data.structuralType, data.parentId);
                }
            }

            return await this.prisma.location.create({
                data: {
                    name: data.name,
                    warehouseId: data.warehouseId,
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
                },
            });
        } catch (e: any) {
            this.log(`Error creating location: ${e.message}`);
            throw e;
        }
    }

    async updateLocation(id: string, data: {
        name?: string;
        parentId?: string | null;
        type?: string;
        structuralType?: string;
        attributes?: any;
        removalStrategy?: string;
        inventoryFrequency?: number;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        rotation?: number;
    }) {
        // Validation
        const current = await this.prisma.location.findUnique({ where: { id } });
        if (!current) throw new Error('Location not found');

        const newStructuralType = data.structuralType !== undefined ? data.structuralType : current.structuralType;
        const newParentId = data.parentId !== undefined ? data.parentId : current.parentId;

        if (newStructuralType && newStructuralType !== 'WAREHOUSE' && !newParentId) {
            throw new Error(`Location of type ${newStructuralType} must have a parent.`);
        }

        if (newStructuralType && newParentId) {
            // Only validate if something changed or if we just want to be safe. 
            // Optimization: only if type or parent changed.
            if (data.structuralType || data.parentId) {
                await this.validateHierarchy(newStructuralType, newParentId);
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
                x: data.x,
                y: data.y,
                width: data.width,
                height: data.height,
                rotation: data.rotation,
            },
        });
    }

    private async validateHierarchy(childType: string, parentId: string) {
        const parent = await this.prisma.location.findUnique({ where: { id: parentId } });
        if (!parent) throw new Error('Parent location not found');

        const parentType = parent.structuralType;
        if (!parentType) return; // If parent has no structural type, assume it's flexible (migration support)

        // Strict Hierarchy: Child -> Allowed Parent
        const validParents: { [key: string]: string[] } = {
            'POSITION': ['SHELF'],
            'SHELF': ['BAY'],
            'BAY': ['ROW'],
            'ROW': ['ROOM'],
            'ROOM': ['WAREHOUSE'],
        };

        const allowedParents = validParents[childType];
        if (allowedParents && !allowedParents.includes(parentType)) {
            throw new Error(`Invalid hierarchy: ${childType} must be a child of ${allowedParents.join(' or ')}. Found parent type: ${parentType}`);
        }
    }

    async getLocationDetails(id: string) {
        const location = await this.prisma.location.findUnique({
            where: { id },
            include: { parent: true }
        });
        if (!location) throw new Error('Location not found');

        // Resolve inherited properties
        const inheritedAttributes = await this.resolveProperties(location);

        return {
            ...location,
            attributes: location.attributes ? JSON.parse(location.attributes) : {},
            inheritedAttributes
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
                    // Merge attributes (parent attributes are defaults, child overrides if needed, but here we want to show what is inherited)
                    // For "inheritance", we usually mean properties that apply to children.
                    // Let's accumulate them.
                    mergedAttributes = { ...mergedAttributes, ...attrs };
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

    async applyAdjustment(id: string) {
        return this.prisma.$transaction(async (tx) => {
            const adjustment = await tx.inventoryAdjustment.findUnique({ where: { id } });
            if (!adjustment) throw new Error('Adjustment not found');
            if (adjustment.status === 'APPLIED') throw new Error('Adjustment already applied');

            // Update status
            await tx.inventoryAdjustment.update({
                where: { id },
                data: { status: 'APPLIED' },
            });

            await this._applyAdjustmentLogic(tx, adjustment);
            return adjustment;
        });
    }

    private async _applyAdjustmentLogic(tx: any, adjustment: any) {
        await this.validateLocationForStock(adjustment.locationId);

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

    async getAdjustments(status?: string) {
        const where = status ? { status } : {};
        return this.prisma.inventoryAdjustment.findMany({
            where,
            include: { product: true, location: true, batch: true },
            orderBy: { createdAt: 'desc' },
        });
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
                throw new Error('Insufficient stock in batches to scrap');
            }

            // Update Aggregate Inventory
            const inventory = await tx.productInventory.findFirst({
                where: {
                    productId: data.productId,
                    locationId: data.locationId,
                },
            });

            if (!inventory || inventory.quantity < data.quantity) {
                throw new Error('Insufficient stock in aggregate inventory to scrap');
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
                    throw new Error('Cannot move a location inside itself');
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

    async createPutawayRule(data: { productId?: string; categoryId?: string; locationId: string; sourceLocationId?: string; priority: number }) {
        return this.prisma.putawayRule.create({
            data: {
                productId: data.productId,
                categoryId: data.categoryId,
                locationId: data.locationId,
                sourceLocationId: data.sourceLocationId,
                priority: data.priority,
            },
        });
    }

    async getPutawayRules() {
        return this.prisma.putawayRule.findMany({
            include: { product: true, location: true, sourceLocation: true },
            orderBy: { priority: 'desc' },
        });
    }

    async applyPutawayStrategy(productId: string, currentLocationId?: string): Promise<string | null> {
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

        return rules.length > 0 ? rules[0].locationId : null;
    }

    async suggestRemoval(locationId: string, productId: string, quantity: number) {
        const location = await this.prisma.location.findUnique({ where: { id: locationId } });
        if (!location) throw new Error('Location not found');

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
        await this.validateLocationForStock(data.destinationLocationId);

        return this.prisma.$transaction(async (tx) => {
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
                throw new Error('Insufficient stock in source location');
            }

            await tx.inventoryBatch.update({
                where: { id: sourceBatch.id },
                data: { currentQuantity: { decrement: data.quantity } },
            });


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

    async getStockTransactions() {
        return this.prisma.stockTransaction.findMany({
            orderBy: { date: 'desc' },
            include: {
                product: true,
                // @ts-ignore
                batch: { include: { location: true } },
            },
            take: 100, // Limit to last 100 moves for now
        });
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
        if (!location) throw new Error('Location not found');
        if (location.type === 'VIEW') {
            throw new Error(`Cannot store stock in a VIEW location: ${location.name}`);
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

        // Apply Putaway Strategy
        // 1. Direct Putaway: If arriving at a location that has a rule, redirect to the rule's destination.
        // 2. Outgoing Putaway: If leaving a location (Source) and no destination specified, use rule's destination.

        let finalDestinationId = data.destinationLocationId;

        // Check Redirect (arriving at X -> move to Y)
        if (data.destinationLocationId) {
            const redirectId = await this.applyPutawayStrategy(data.productId, data.destinationLocationId);
            if (redirectId) {
                finalDestinationId = redirectId;
            }
        }

        // Check Default Destination (leaving X -> move to Y)
        // Only if destination is not yet set (or was not redirected? No, if we redirected, we have a dest).
        // If we didn't have a dest, and didn't redirect, check source.
        if (!finalDestinationId && data.sourceLocationId) {
            const putawayId = await this.applyPutawayStrategy(data.productId, data.sourceLocationId);
            if (putawayId) {
                finalDestinationId = putawayId;
            }
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

        // Trigger Procurement (Pull Rules) if source location is internal
        if (move.sourceLocationId) {
            await this.checkProcurement(move.productId, move.quantity, move.sourceLocationId, prisma);
        }

        return move;
    }

    async checkProcurement(productId: string, quantity: number, locationId: string, tx?: any) {
        const prisma = tx || this.prisma;
        // Check for PULL rules targeting this location
        const rules = await prisma.rule.findMany({
            where: {
                destinationLocationId: locationId,
                action: 'PULL',
            },
            orderBy: { sequence: 'asc' }
        });

        for (const rule of rules) {
            // Create upstream move
            // If source is null, it means Buy/Vendor, which we might handle differently (e.g. create PO request)
            // For now, we'll just create a move from null (Vendor) to Location if source is null
            // Or if source is set, create move from Source to Location

            await this.createStockMove({
                productId,
                quantity,
                sourceLocationId: rule.sourceLocationId,
                destinationLocationId: locationId,
                ruleId: rule.id,
                status: 'WAITING', // Upstream move is waiting
                origin: 'Procurement',
            }, prisma);

            // Note: createStockMove recursively calls checkProcurement for the new source
        }
    }

    async getStockMoves(status?: string) {
        const where = status ? { status } : {};
        return this.prisma.stockMove.findMany({
            where,
            include: { product: true, sourceLocation: true, destinationLocation: true, rule: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async validateStockMove(id: string) {
        return this.prisma.$transaction(async (tx) => {
            const move = await tx.stockMove.findUnique({ where: { id } });
            if (!move) throw new Error('Stock move not found');
            if (move.status === 'DONE') throw new Error('Stock move already done');

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
                                batchNumber: `MOVE-${Date.now()}`
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
                            batchNumber: `REC-${Date.now()}`
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

            // 3. Chaining Logic: Check for PUSH rules at destination
            if (move.destinationLocationId) {
                const pushRules = await tx.rule.findMany({
                    where: {
                        sourceLocationId: move.destinationLocationId,
                        action: 'PUSH',
                    },
                    orderBy: { sequence: 'asc' }
                });

                for (const rule of pushRules) {
                    // Create chained move
                    await tx.stockMove.create({
                        data: {
                            productId: move.productId,
                            quantity: move.quantity,
                            sourceLocationId: move.destinationLocationId,
                            destinationLocationId: rule.destinationLocationId,
                            ruleId: rule.id,
                            origin: move.origin,
                            status: 'WAITING', // Waiting for user to validate this next step
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
                if (Array.isArray(supported) && !supported.includes(packaging.type)) {
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
