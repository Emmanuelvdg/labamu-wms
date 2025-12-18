
export class CreateStoDto {
    externalId: string;
    sourceSystem: 'MRP' | 'RETAIL';
    sourceWarehouseId?: string; // Optional, if known
    destinationWarehouseId: string;
    items: {
        sku: string;
        quantity: number;
    }[];
    expectedDate?: string;
}
