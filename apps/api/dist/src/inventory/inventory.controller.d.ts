import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    createProduct(data: any): Promise<{
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
    }>;
    getProducts(): Promise<{
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
    }[]>;
    createWarehouse(data: {
        name: string;
        location: any;
        type: string;
    }): Promise<{
        id: string;
        type: string;
        name: string;
        viewLocationId: string | null;
        shortName: string | null;
        location: string;
        partnerId: string | null;
    }>;
    getWarehouses(): Promise<{
        id: string;
        type: string;
        name: string;
        viewLocationId: string | null;
        shortName: string | null;
        location: string;
        partnerId: string | null;
    }[]>;
    addBatch(data: any): Promise<{
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
    getBatches(productId: string): Promise<{
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
    }[]>;
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
    createAdjustment(data: any): Promise<{
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
    updateAdjustment(id: string, data: any): Promise<{
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
    getAdjustments(): Promise<({
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
            inventoryFrequency: number;
            nextInventoryDate: Date | null;
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
            inventoryFrequency: number;
            nextInventoryDate: Date | null;
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
            inventoryFrequency: number;
            nextInventoryDate: Date | null;
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
    getLocationsTree(warehouseId?: string): Promise<({
        children: ({
            children: {
                id: string;
                type: string;
                name: string;
                removalStrategy: string | null;
                inventoryFrequency: number;
                nextInventoryDate: Date | null;
                parentId: string | null;
                warehouseId: string | null;
            }[];
        } & {
            id: string;
            type: string;
            name: string;
            removalStrategy: string | null;
            inventoryFrequency: number;
            nextInventoryDate: Date | null;
            parentId: string | null;
            warehouseId: string | null;
        })[];
    } & {
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        inventoryFrequency: number;
        nextInventoryDate: Date | null;
        parentId: string | null;
        warehouseId: string | null;
    })[]>;
    getLocations(warehouseId?: string): Promise<({
        warehouseView: {
            id: string;
            type: string;
            name: string;
            viewLocationId: string | null;
            shortName: string | null;
            location: string;
            partnerId: string | null;
        };
    } & {
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        inventoryFrequency: number;
        nextInventoryDate: Date | null;
        parentId: string | null;
        warehouseId: string | null;
    })[]>;
    createLocation(data: any): Promise<{
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        inventoryFrequency: number;
        nextInventoryDate: Date | null;
        parentId: string | null;
        warehouseId: string | null;
    }>;
    moveLocation(id: string, data: {
        newParentId: string | null;
    }): Promise<{
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        inventoryFrequency: number;
        nextInventoryDate: Date | null;
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
            inventoryFrequency: number;
            nextInventoryDate: Date | null;
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
            inventoryFrequency: number;
            nextInventoryDate: Date | null;
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
    assignBatchToPackage(packageId: string, data: {
        batchId: string;
    }): Promise<{
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
    createRule(routeId: string, data: {
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
    checkCycleCounts(): Promise<({
        warehouseView: {
            id: string;
            type: string;
            name: string;
            viewLocationId: string | null;
            shortName: string | null;
            location: string;
            partnerId: string | null;
        };
    } & {
        id: string;
        type: string;
        name: string;
        removalStrategy: string | null;
        inventoryFrequency: number;
        nextInventoryDate: Date | null;
        parentId: string | null;
        warehouseId: string | null;
    })[]>;
    startCycleCount(data: {
        locationIds: string[];
    }): Promise<any[]>;
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
            inventoryFrequency: number;
            nextInventoryDate: Date | null;
            parentId: string | null;
            warehouseId: string | null;
        };
        warehouse: {
            id: string;
            type: string;
            name: string;
            viewLocationId: string | null;
            shortName: string | null;
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
}
//# sourceMappingURL=inventory.controller.d.ts.map