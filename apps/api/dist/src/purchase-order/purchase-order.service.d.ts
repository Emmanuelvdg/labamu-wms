import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RuleService } from '../rule/rule.service';
export declare class PurchaseOrderService {
    private prisma;
    private inventoryService;
    private ruleService;
    constructor(prisma: PrismaService, inventoryService: InventoryService, ruleService: RuleService);
    createPurchaseOrder(data: {
        supplierId: string;
        expectedDate?: Date;
        items: {
            productId: string;
            quantity: number;
            unitCost: number;
        }[];
        destinationLocationId?: string;
    }): Promise<{
        supplier: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            contactInfo: string | null;
        };
        items: {
            id: string;
            productId: string;
            quantity: number;
            unitCost: number;
            purchaseOrderId: string;
        }[];
    } & {
        id: string;
        status: string;
        supplierId: string;
        createdAt: Date;
        updatedAt: Date;
        expectedDate: Date | null;
    }>;
    getPurchaseOrders(): Promise<({
        supplier: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            contactInfo: string | null;
        };
        receipts: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            destinationLocationId: string;
            purchaseOrderId: string;
        }[];
        items: {
            id: string;
            productId: string;
            quantity: number;
            unitCost: number;
            purchaseOrderId: string;
        }[];
    } & {
        id: string;
        status: string;
        supplierId: string;
        createdAt: Date;
        updatedAt: Date;
        expectedDate: Date | null;
    })[]>;
    getPurchaseOrder(id: string): Promise<{
        supplier: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            contactInfo: string | null;
        };
        receipts: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            destinationLocationId: string;
            purchaseOrderId: string;
        }[];
        items: ({
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
                width: number | null;
                height: number | null;
                depth: number | null;
                weight: number | null;
                supplierId: string | null;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitCost: number;
            purchaseOrderId: string;
        })[];
    } & {
        id: string;
        status: string;
        supplierId: string;
        createdAt: Date;
        updatedAt: Date;
        expectedDate: Date | null;
    }>;
    getSuppliers(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        contactInfo: string | null;
    }[]>;
    receiveGoods(purchaseOrderId: string, destinationLocationId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        destinationLocationId: string;
        purchaseOrderId: string;
    }>;
}
//# sourceMappingURL=purchase-order.service.d.ts.map