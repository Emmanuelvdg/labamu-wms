import { StrategyService } from './strategy.service';
import { PickingStrategyService } from './picking-strategy.service';
export declare class StrategyController {
    private readonly strategyService;
    private readonly pickingStrategyService;
    constructor(strategyService: StrategyService, pickingStrategyService: PickingStrategyService);
    evaluatePicking(data: {
        priority: string;
        itemCount: number;
        items: any[];
    }): Promise<string>;
    evaluateReservation(data: {
        isPerishable: boolean;
        location: any;
    }): Promise<string>;
    getPickingStrategies(): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }[]>;
    getReservationStrategies(): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }[]>;
    togglePicking(id: string, active: boolean): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }>;
    toggleReservation(id: string, active: boolean): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }>;
    createPickingStrategy(data: {
        name: string;
        rules?: string;
    }): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }>;
    updatePickingStrategy(id: string, data: any): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }>;
    deletePickingStrategy(id: string): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }>;
    createReservationStrategy(data: {
        name: string;
        rules?: string;
    }): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }>;
    updateReservationStrategy(id: string, data: any): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }>;
    deleteReservationStrategy(id: string): Promise<{
        id: string;
        name: string;
        rules: string;
        active: boolean;
    }>;
    createBatch(data: {
        criteria: 'contact' | 'carrier' | 'location';
    }): Promise<{
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
    createCluster(data: {
        size: number;
    }): Promise<{
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
    createWave(data: {
        criteria: 'product' | 'category';
    }): Promise<{
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
//# sourceMappingURL=strategy.controller.d.ts.map