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
        type: string;
        productId: string;
        quantity: number;
        createdAt: Date;
        updatedAt: Date;
        batchId: string | null;
        date: Date;
        referenceId: string | null;
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
                name: string;
                id: string;
                type: string;
                warehouseId: string | null;
                removalStrategy: string | null;
                parentId: string | null;
            }[];
        } & {
            name: string;
            id: string;
            type: string;
            warehouseId: string | null;
            removalStrategy: string | null;
            parentId: string | null;
        })[];
    } & {
        name: string;
        id: string;
        type: string;
        warehouseId: string | null;
        removalStrategy: string | null;
        parentId: string | null;
    })[]>;
    createLocation(data: {
        name: string;
        warehouseId?: string;
        parentId?: string;
        type?: string;
        removalStrategy?: string;
    }): Promise<{
        name: string;
        id: string;
        type: string;
        warehouseId: string | null;
        removalStrategy: string | null;
        parentId: string | null;
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
        status: string;
        productId: string;
        locationId: string;
        quantity: number;
        currentQuantity: number;
        createdAt: Date;
        updatedAt: Date;
        batchId: string | null;
        countedQuantity: number;
        reason: string;
    }>;
    updateAdjustment(id: string, data: {
        countedQuantity?: number;
        locationId?: string;
        status?: string;
    }): Promise<{
        id: string;
        status: string;
        productId: string;
        locationId: string;
        quantity: number;
        currentQuantity: number;
        createdAt: Date;
        updatedAt: Date;
        batchId: string | null;
        countedQuantity: number;
        reason: string;
    }>;
    applyAdjustment(id: string): Promise<{
        id: string;
        status: string;
        productId: string;
        locationId: string;
        quantity: number;
        currentQuantity: number;
        createdAt: Date;
        updatedAt: Date;
        batchId: string | null;
        countedQuantity: number;
        reason: string;
    }>;
    private _applyAdjustmentLogic;
    getAdjustments(status?: string): Promise<({
        product: {
            name: string;
            id: string;
            sku: string;
            category: string;
            classification: string | null;
            type: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            status: string;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        location: {
            name: string;
            id: string;
            type: string;
            warehouseId: string | null;
            removalStrategy: string | null;
            parentId: string | null;
        };
        batch: {
            id: string;
            status: string;
            expiryDate: Date | null;
            productId: string;
            warehouseId: string;
            locationId: string | null;
            batchNumber: string;
            packageId: string | null;
            initialQuantity: number;
            currentQuantity: number;
            costPerUnit: number;
            purchaseDate: Date;
            vendor: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        status: string;
        productId: string;
        locationId: string;
        quantity: number;
        currentQuantity: number;
        createdAt: Date;
        updatedAt: Date;
        batchId: string | null;
        countedQuantity: number;
        reason: string;
    })[]>;
    createScrapOrder(data: {
        locationId: string;
        productId: string;
        quantity: number;
        reason: string;
    }): Promise<{
        id: string;
        productId: string;
        locationId: string;
        quantity: number;
        maxQuantity: number;
        active: boolean;
    }>;
    getScrapOrders(): Promise<({
        product: {
            name: string;
            id: string;
            sku: string;
            category: string;
            classification: string | null;
            type: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            status: string;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        location: {
            name: string;
            id: string;
            type: string;
            warehouseId: string | null;
            removalStrategy: string | null;
            parentId: string | null;
        };
    } & {
        id: string;
        productId: string;
        locationId: string;
        quantity: number;
        maxQuantity: number;
        active: boolean;
    })[]>;
    moveLocation(locationId: string, newParentId: string | null): Promise<{
        name: string;
        id: string;
        type: string;
        warehouseId: string | null;
        removalStrategy: string | null;
        parentId: string | null;
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
            name: string;
            id: string;
            sku: string;
            category: string;
            classification: string | null;
            type: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            status: string;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        location: {
            name: string;
            id: string;
            type: string;
            warehouseId: string | null;
            removalStrategy: string | null;
            parentId: string | null;
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
        name: string;
        id: string;
        type: string;
        locationId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getPackages(): Promise<({
        location: {
            name: string;
            id: string;
            type: string;
            warehouseId: string | null;
            removalStrategy: string | null;
            parentId: string | null;
        };
        batches: ({
            product: {
                name: string;
                id: string;
                sku: string;
                category: string;
                classification: string | null;
                type: string | null;
                unitOfMeasure: string | null;
                isStockable: boolean;
                status: string;
                averageCost: number;
                description: string | null;
                tracking: string;
                expiryDate: Date | null;
                supplierId: string | null;
            };
        } & {
            id: string;
            status: string;
            expiryDate: Date | null;
            productId: string;
            warehouseId: string;
            locationId: string | null;
            batchNumber: string;
            packageId: string | null;
            initialQuantity: number;
            currentQuantity: number;
            costPerUnit: number;
            purchaseDate: Date;
            vendor: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
    } & {
        name: string;
        id: string;
        type: string;
        locationId: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    assignBatchToPackage(batchId: string, packageId: string): Promise<{
        id: string;
        status: string;
        expiryDate: Date | null;
        productId: string;
        warehouseId: string;
        locationId: string | null;
        batchNumber: string;
        packageId: string | null;
        initialQuantity: number;
        currentQuantity: number;
        costPerUnit: number;
        purchaseDate: Date;
        vendor: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createRoute(data: {
        name: string;
        description?: string;
    }): Promise<{
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getRoutes(): Promise<({
        rules: {
            id: string;
            action: string;
            sequence: number;
            routeId: string;
            sourceLocationId: string | null;
            destinationLocationId: string | null;
        }[];
    } & {
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    createRule(data: {
        routeId: string;
        action: string;
        sourceLocationId?: string;
        destinationLocationId?: string;
        sequence?: number;
    }): Promise<{
        id: string;
        action: string;
        sequence: number;
        routeId: string;
        sourceLocationId: string | null;
        destinationLocationId: string | null;
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
            name: string;
            id: string;
            sku: string;
            category: string;
            classification: string | null;
            type: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            status: string;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        location: {
            name: string;
            id: string;
            type: string;
            warehouseId: string | null;
            removalStrategy: string | null;
            parentId: string | null;
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
        type: string;
        productId: string;
        quantity: number;
        createdAt: Date;
        updatedAt: Date;
        batchId: string | null;
        date: Date;
        referenceId: string | null;
    }[]>;
    checkCycleCounts(): Promise<({
        warehouseView: {
            location: string;
            name: string;
            id: string;
            type: string;
            partnerId: string | null;
            viewLocationId: string | null;
        };
    } & {
        name: string;
        id: string;
        type: string;
        warehouseId: string | null;
        removalStrategy: string | null;
        parentId: string | null;
    })[]>;
    getTransitItems(): Promise<({
        product: {
            name: string;
            id: string;
            sku: string;
            category: string;
            classification: string | null;
            type: string | null;
            unitOfMeasure: string | null;
            isStockable: boolean;
            status: string;
            averageCost: number;
            description: string | null;
            tracking: string;
            expiryDate: Date | null;
            supplierId: string | null;
        };
        warehouse: {
            location: string;
            name: string;
            id: string;
            type: string;
            partnerId: string | null;
            viewLocationId: string | null;
        };
        location: {
            name: string;
            id: string;
            type: string;
            warehouseId: string | null;
            removalStrategy: string | null;
            parentId: string | null;
        };
    } & {
        id: string;
        status: string;
        expiryDate: Date | null;
        productId: string;
        warehouseId: string;
        locationId: string | null;
        batchNumber: string;
        packageId: string | null;
        initialQuantity: number;
        currentQuantity: number;
        costPerUnit: number;
        purchaseDate: Date;
        vendor: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    createCycleCountAdjustments(locationIds: string[]): Promise<any[]>;
    private validateLocationForStock;
}
//# sourceMappingURL=inventory.service.d.ts.map