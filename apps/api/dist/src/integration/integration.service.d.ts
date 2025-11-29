import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
export declare class IntegrationService {
    private prisma;
    private inventoryService;
    constructor(prisma: PrismaService, inventoryService: InventoryService);
    syncSalesChannel(channel: string): Promise<any>;
    syncLogistics(partner: string): Promise<any>;
}
//# sourceMappingURL=integration.service.d.ts.map