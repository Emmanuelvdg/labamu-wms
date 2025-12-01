import { PrismaService } from '../prisma.service';
import { Product, Warehouse, ProductInventory, InventoryBatch } from '@labamu/database';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    createProduct(data: any): Promise<Product>;
    getProducts(): Promise<Product[]>;
    createWarehouse(data: {
        name: string;
        location: any;
        type: string;
    }): Promise<Warehouse>;
    getWarehouses(): Promise<Warehouse[]>;
    addStock(data: {
        productId: string;
        warehouseId: string;
        quantity: number;
        locationId?: string;
    }): Promise<ProductInventory>;
    getStock(productId: string): Promise<ProductInventory[]>;
    addBatch(data: {
        productId: string;
        warehouseId: string;
        locationId?: string;
        quantity: number;
        costPerUnit: number;
        purchaseDate: Date;
        expiryDate?: Date;
        vendor?: string;
        batchNumber?: string;
    }): Promise<InventoryBatch>;
    getBatches(productId: string): Promise<InventoryBatch[]>;
    getTransactions(productId: string): Promise<{
        id: string;
        productId: string;
        batchId: string | null;
        type: string;
        quantity: number;
        date: Date;
        referenceId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    reserveStock(data: {
        orderId: string;
        items: {
            productId: string;
            quantity: number;
        }[];
        strategy: string;
    }): Promise<any>;
    getLocationsTree(warehouseId?: string): Promise<({
        children: ({
            children: {
                id: string;
                type: string;
                name: string;
                removalStrategy: string | null;
                parentId: string | null;
                warehouseId: string | null;
            }[];
        } & {
            id: string;
            type: string;
            name: string;
            removalStrategy: string | null;
            parentId: string | null;
            warehouseId: string | null;
        })[];
    } & {
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        parentId: string | null;
        warehouseId: string | null;
    })[]>;
    getLocations(warehouseId?: string): Promise<({
        warehouseView: {
            id: string;
            type: string;
            name: string;
            viewLocationId: string | null;
            location: string;
            partnerId: string | null;
        };
    } & {
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        parentId: string | null;
        warehouseId: string | null;
    })[]>;
    createLocation(data: {
        name: string;
        warehouseId?: string;
        parentId?: string;
        type?: string;
        removalStrategy?: string;
    }): Promise<{
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        parentId: string | null;
        warehouseId: string | null;
    }>;
    createAdjustment(data: {
        locationId: string;
        productId: string;
        countedQuantity: number;
        currentQuantity: number;
        batchId?: string;
        reason: string;
        status?: string;
    }): Promise<{
        id: string;
        productId: string;
        batchId: string | null;
        quantity: number;
        createdAt: Date;
        updatedAt: Date;
        countedQuantity: number;
        currentQuantity: number;
        reason: string;
        status: string;
        locationId: string;
    }>;
    updateAdjustment(id: string, data: {
        countedQuantity?: number;
        locationId?: string;
        status?: string;
    }): Promise<{
        id: string;
        productId: string;
        batchId: string | null;
        quantity: number;
        createdAt: Date;
        updatedAt: Date;
        countedQuantity: number;
        currentQuantity: number;
        reason: string;
        status: string;
        locationId: string;
    }>;
    applyAdjustment(id: string): Promise<{
        id: string;
        productId: string;
        batchId: string | null;
        quantity: number;
        createdAt: Date;
        updatedAt: Date;
        countedQuantity: number;
        currentQuantity: number;
        reason: string;
        status: string;
        locationId: string;
    }>;
    private _applyAdjustmentLogic;
    getAdjustments(status?: string): Promise<({
        product: {
            id: string;
            type: string | null;
            name: string;
            status: string;
            sku: string;
            category: string;
            classification: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        location: {
            id: string;
            type: string;
            name: string;
            removalStrategy: string | null;
            parentId: string | null;
            warehouseId: string | null;
        };
        batch: {
            id: string;
            productId: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string;
            currentQuantity: number;
            status: string;
            locationId: string | null;
            expiryDate: Date | null;
            batchNumber: string;
            packageId: string | null;
            initialQuantity: number;
            costPerUnit: number;
            purchaseDate: Date;
            vendor: string | null;
        };
    } & {
        id: string;
        productId: string;
        batchId: string | null;
        quantity: number;
        createdAt: Date;
        updatedAt: Date;
        countedQuantity: number;
        currentQuantity: number;
        reason: string;
        status: string;
        locationId: string;
    })[]>;
    createScrapOrder(data: {
        locationId: string;
        productId: string;
        quantity: number;
        reason: string;
    }): Promise<{
        id: string;
        productId: string;
        quantity: number;
        locationId: string;
        maxQuantity: number;
        active: boolean;
    }>;
    getScrapOrders(): Promise<({
        product: {
            id: string;
            type: string | null;
            name: string;
            status: string;
            sku: string;
            category: string;
            classification: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        location: {
            id: string;
            type: string;
            name: string;
            removalStrategy: string | null;
            parentId: string | null;
            warehouseId: string | null;
        };
    } & {
        id: string;
        productId: string;
        quantity: number;
        locationId: string;
        maxQuantity: number;
        active: boolean;
    })[]>;
    moveLocation(locationId: string, newParentId: string | null): Promise<{
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        parentId: string | null;
        warehouseId: string | null;
    }>;
    createPutawayRule(data: {
        productId?: string;
        categoryId?: string;
        locationId: string;
        priority: number;
    }): Promise<{
        id: string;
        productId: string | null;
        locationId: string;
        active: boolean;
        categoryId: string | null;
        priority: number;
    }>;
    getPutawayRules(): Promise<({
        product: {
            id: string;
            type: string | null;
            name: string;
            status: string;
            sku: string;
            category: string;
            classification: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        location: {
            id: string;
            type: string;
            name: string;
            removalStrategy: string | null;
            parentId: string | null;
            warehouseId: string | null;
        };
    } & {
        id: string;
        productId: string | null;
        locationId: string;
        active: boolean;
        categoryId: string | null;
        priority: number;
    })[]>;
    applyPutawayStrategy(productId: string): Promise<string | null>;
    suggestRemoval(locationId: string, productId: string, quantity: number): Promise<any[]>;
    createPackage(data: {
        name: string;
        type: string;
        locationId?: string;
    }): Promise<{
        id: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        locationId: string | null;
    }>;
    getPackages(): Promise<({
        location: {
            id: string;
            type: string;
            name: string;
            removalStrategy: string | null;
            parentId: string | null;
            warehouseId: string | null;
        };
        batches: ({
            product: {
                id: string;
                type: string | null;
                name: string;
                status: string;
                sku: string;
                category: string;
                classification: string | null;
                unitOfMeasure: string | null;
                isStockable: boolean;
                averageCost: number;
                description: string | null;
                tracking: string;
                expiryDate: Date | null;
                supplierId: string | null;
            };
        } & {
            id: string;
            productId: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string;
            currentQuantity: number;
            status: string;
            locationId: string | null;
            expiryDate: Date | null;
            batchNumber: string;
            packageId: string | null;
            initialQuantity: number;
            costPerUnit: number;
            purchaseDate: Date;
            vendor: string | null;
        })[];
    } & {
        id: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        locationId: string | null;
    })[]>;
    assignBatchToPackage(batchId: string, packageId: string): Promise<{
        id: string;
        productId: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        currentQuantity: number;
        status: string;
        locationId: string | null;
        expiryDate: Date | null;
        batchNumber: string;
        packageId: string | null;
        initialQuantity: number;
        costPerUnit: number;
        purchaseDate: Date;
        vendor: string | null;
    }>;
    createRoute(data: {
        name: string;
        description?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    getRoutes(): Promise<({
        rules: {
            id: string;
            routeId: string;
            action: string;
            sourceLocationId: string | null;
            destinationLocationId: string | null;
            sequence: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    })[]>;
    createRule(data: {
        routeId: string;
        action: string;
        sourceLocationId?: string;
        destinationLocationId?: string;
        sequence?: number;
    }): Promise<{
        id: string;
        routeId: string;
        action: string;
        sourceLocationId: string | null;
        destinationLocationId: string | null;
        sequence: number;
    }>;
    createTransfer(data: {
        productId: string;
        sourceLocationId: string;
        destinationLocationId: string;
        quantity: number;
        reason?: string;
    }): Promise<{
        success: boolean;
    }>;
    createReorderingRule(data: {
        productId: string;
        locationId: string;
        minQuantity: number;
        maxQuantity: number;
    }): Promise<{
        id: string;
        productId: string;
        locationId: string;
        maxQuantity: number;
        active: boolean;
        minQuantity: number;
    }>;
    getReorderingRules(): Promise<({
        product: {
            id: string;
            type: string | null;
            name: string;
            status: string;
            sku: string;
            category: string;
            classification: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        location: {
            id: string;
            type: string;
            name: string;
            removalStrategy: string | null;
            parentId: string | null;
            warehouseId: string | null;
        };
    } & {
        id: string;
        productId: string;
        locationId: string;
        maxQuantity: number;
        active: boolean;
        minQuantity: number;
    })[]>;
    checkReorderingRules(): Promise<any[]>;
    getValuation(): Promise<{
        totalValue: number;
        products: any[];
    }>;
    getStockMoves(): Promise<{
        id: string;
        productId: string;
        batchId: string | null;
        type: string;
        quantity: number;
        date: Date;
        referenceId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    checkCycleCounts(): Promise<({
        warehouseView: {
            id: string;
            type: string;
            name: string;
            viewLocationId: string | null;
            location: string;
            partnerId: string | null;
        };
    } & {
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        parentId: string | null;
        warehouseId: string | null;
    })[]>;
    getTransitItems(): Promise<({
        product: {
            id: string;
            type: string | null;
            name: string;
            status: string;
            sku: string;
            category: string;
            classification: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        location: {
            id: string;
            type: string;
            name: string;
            removalStrategy: string | null;
            parentId: string | null;
            warehouseId: string | null;
        };
        warehouse: {
            id: string;
            type: string;
            name: string;
            viewLocationId: string | null;
            location: string;
            partnerId: string | null;
        };
    } & {
        id: string;
        productId: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        currentQuantity: number;
        status: string;
        locationId: string | null;
        expiryDate: Date | null;
        batchNumber: string;
        packageId: string | null;
        initialQuantity: number;
        costPerUnit: number;
        purchaseDate: Date;
        vendor: string | null;
    })[]>;
    createCycleCountAdjustments(locationIds: string[]): Promise<any[]>;
    private validateLocationForStock;
}
//# sourceMappingURL=inventory.service.d.ts.map