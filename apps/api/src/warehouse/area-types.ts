export enum AreaType {
    RECEIVING = 'RECEIVING',
    STAGING = 'STAGING',
    PUTAWAY_LANE = 'PUTAWAY_LANE',
    STORAGE = 'STORAGE',
    PICKING = 'PICKING',
    PACKING = 'PACKING',
    SHIPPING = 'SHIPPING',
}

export const AREA_TYPE_LABELS = {
    [AreaType.RECEIVING]: 'Receiving Dock',
    [AreaType.STAGING]: 'Staging Area',
    [AreaType.PUTAWAY_LANE]: 'Putaway Lane',
    [AreaType.STORAGE]: 'Storage',
    [AreaType.PICKING]: 'Picking Zone',
    [AreaType.PACKING]: 'Packing Area',
    [AreaType.SHIPPING]: 'Shipping Dock',
};

export const AREA_TYPE_COLORS = {
    [AreaType.RECEIVING]: '#3b82f6', // blue-500
    [AreaType.STAGING]: '#8b5cf6', // violet-500
    [AreaType.PUTAWAY_LANE]: '#14b8a6', // teal-500
    [AreaType.STORAGE]: '#f59e0b', // amber-500
    [AreaType.PICKING]: '#10b981', // emerald-500
    [AreaType.PACKING]: '#ec4899', // pink-500
    [AreaType.SHIPPING]: '#6366f1', // indigo-500
};

export const AREA_TYPE_ICONS = {
    [AreaType.RECEIVING]: 'truck',
    [AreaType.STAGING]: 'package-check',
    [AreaType.PUTAWAY_LANE]: 'arrow-right-left',
    [AreaType.STORAGE]: 'boxes',
    [AreaType.PICKING]: 'shopping-cart',
    [AreaType.PACKING]: 'package',
    [AreaType.SHIPPING]: 'truck-loading',
};

export type WarehouseSteps = '1_step' | '2_steps' | '3_steps';

export interface WarehouseConfig {
    incomingSteps?: WarehouseSteps;
    outgoingSteps?: WarehouseSteps;
}

export function getRequiredAreaTypes(config: WarehouseConfig): AreaType[] {
    const areas: AreaType[] = [AreaType.STORAGE]; // Always required

    // Inbound areas
    switch (config.incomingSteps) {
        case '3_steps':
            areas.push(AreaType.RECEIVING, AreaType.STAGING, AreaType.PUTAWAY_LANE);
            break;
        case '2_steps':
            areas.push(AreaType.RECEIVING, AreaType.STAGING);
            break;
        case '1_step':
        default:
            areas.push(AreaType.RECEIVING);
            break;
    }

    // Outbound areas
    switch (config.outgoingSteps) {
        case '3_steps':
            areas.push(AreaType.PICKING, AreaType.PACKING, AreaType.SHIPPING);
            break;
        case '2_steps':
            areas.push(AreaType.PICKING, AreaType.SHIPPING);
            break;
        case '1_step':
        default:
            areas.push(AreaType.SHIPPING);
            break;
    }

    return areas;
}
