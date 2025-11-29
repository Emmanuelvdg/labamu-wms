import { PrismaService } from '../prisma.service';
export declare class StrategyService {
    private prisma;
    constructor(prisma: PrismaService);
    evaluatePickingStrategy(orderData: {
        priority: string;
        itemCount: number;
        items: any[];
    }): Promise<string>;
    evaluateReservationStrategy(productData: {
        isPerishable: boolean;
        location: any;
    }): Promise<string>;
    getPickingStrategies(): Promise<{
        name: string;
        id: string;
        active: boolean;
        rules: string;
    }[]>;
    getReservationStrategies(): Promise<{
        name: string;
        id: string;
        active: boolean;
        rules: string;
    }[]>;
    togglePickingStrategy(id: string, active: boolean): Promise<{
        name: string;
        id: string;
        active: boolean;
        rules: string;
    }>;
    toggleReservationStrategy(id: string, active: boolean): Promise<{
        name: string;
        id: string;
        active: boolean;
        rules: string;
    }>;
}
//# sourceMappingURL=strategy.service.d.ts.map