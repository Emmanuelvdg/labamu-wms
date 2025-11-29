import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
export declare class RuleService {
    private prisma;
    private inventoryService;
    private readonly logger;
    constructor(prisma: PrismaService, inventoryService: InventoryService);
    applyPushRules(productId: string, locationId: string, quantity: number): Promise<void>;
}
//# sourceMappingURL=rule.service.d.ts.map