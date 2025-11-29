import { StrategyService } from './strategy.service';
export declare class StrategyController {
    private readonly strategyService;
    constructor(strategyService: StrategyService);
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
    togglePicking(id: string, active: boolean): Promise<{
        name: string;
        id: string;
        active: boolean;
        rules: string;
    }>;
    toggleReservation(id: string, active: boolean): Promise<{
        name: string;
        id: string;
        active: boolean;
        rules: string;
    }>;
}
//# sourceMappingURL=strategy.controller.d.ts.map