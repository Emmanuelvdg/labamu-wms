export class PickingSessionCompletedEvent {
    constructor(
        public readonly sessionId: string,
        public readonly warehouseId: string,
        public readonly orderIds: string[],
        public readonly tasks: any[]
    ) {}
}

export const PICKING_SESSION_COMPLETED = 'picking.session.completed';
