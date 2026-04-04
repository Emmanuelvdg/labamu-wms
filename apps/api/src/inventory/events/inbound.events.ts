export class ReceiptCompletedEvent {
    constructor(
        public readonly receiptId: string,
        public readonly warehouseId: string,
        public readonly purchaseOrderId: string,
        public readonly items: {
            productId: string;
            quantity: number;
            locationId: string;
        }[]
    ) {}
}
