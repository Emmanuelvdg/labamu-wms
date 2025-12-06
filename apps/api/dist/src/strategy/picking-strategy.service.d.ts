import { PrismaService } from '../prisma.service';
export declare class PickingStrategyService {
    private prisma;
    constructor(prisma: PrismaService);
    createBatch(criteria?: 'contact' | 'carrier' | 'location'): Promise<{
        message: string;
        type?: undefined;
        criteria?: undefined;
        generatedBatches?: undefined;
    } | {
        type: string;
        criteria: "contact" | "carrier" | "location";
        generatedBatches: {
            batchKey: string;
            orderCount: number;
            orderIds: string[];
        }[];
        message?: undefined;
    }>;
    createClusterBatch(maxSize?: number): Promise<{
        message: string;
        type?: undefined;
        clusterId?: undefined;
        assignments?: undefined;
    } | {
        type: string;
        clusterId: string;
        assignments: {
            orderId: string;
            toteLabel: string;
            items: {
                id: string;
                orderId: string;
                productId: string;
                quantity: number;
            }[];
        }[];
        message?: undefined;
    }>;
    createWave(criteria?: 'product' | 'category'): Promise<{
        message: string;
        type?: undefined;
        criteria?: undefined;
        waveId?: undefined;
        pickingList?: undefined;
    } | {
        type: string;
        criteria: "product" | "category";
        waveId: string;
        pickingList: {
            productId: string;
            productName: string;
            totalQty: number;
            orderIds: string[];
        }[];
        message?: undefined;
    }>;
}
//# sourceMappingURL=picking-strategy.service.d.ts.map