import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma.service';
import { PackagingService } from './packaging.service';
import { PutawayService } from './putaway.service';

describe('InventoryService - Average Cost Calculation', () => {
    let service: InventoryService;
    let prisma: PrismaService;

    const mockPrismaService = {
        product: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        productInventory: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        inventoryBatch: {
            create: jest.fn(),
        },
        stockTransaction: {
            create: jest.fn(),
        },
    };

    const mockPackagingService = {};
    const mockPutawayService = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: PackagingService, useValue: mockPackagingService },
                { provide: PutawayService, useValue: mockPutawayService },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('addBatch with average cost calculation', () => {
        it('should set average cost to batch cost for first batch', async () => {
            const productId = 'prod-1';
            const batchData = {
                productId,
                warehouseId: 'wh-1',
                quantity: 100,
                costPerUnit: 10,
                purchaseDate: new Date(),
            };

            // Mock: Product exists with no average cost
            mockPrismaService.product.findUnique.mockResolvedValue({
                id: productId,
                averageCost: 0,
                tracking: 'none',
            });

            // Mock: No existing inventory
            mockPrismaService.productInventory.findMany.mockResolvedValue([]);

            // Mock: Batch creation
            mockPrismaService.inventoryBatch.create.mockResolvedValue({
                id: 'batch-1',
                ...batchData,
            });

            // Mock: No existing inventory record
            mockPrismaService.productInventory.findFirst.mockResolvedValue(null);

            // Mock: New inventory creation
            mockPrismaService.productInventory.create.mockResolvedValue({
                id: 'inv-1',
                productId,
                quantity: 100,
            });

            // Mock: Transaction creation
            mockPrismaService.stockTransaction.create.mockResolvedValue({ id: 'tx-1' });

            await service.addBatch(batchData);

            // Verify average cost was updated to batch cost (first batch)
            expect(mockPrismaService.product.update).toHaveBeenCalledWith({
                where: { id: productId },
                data: { averageCost: 10 }, // First batch, so avg = cost
            });
        });

        it('should calculate weighted average cost for second batch', async () => {
            const productId = 'prod-1';
            const batchData = {
                productId,
                warehouseId: 'wh-1',
                quantity: 50,
                costPerUnit: 15,
                purchaseDate: new Date(),
            };

            // Mock: Product exists with average cost from first batch
            mockPrismaService.product.findUnique.mockResolvedValue({
                id: productId,
                averageCost: 10, // From first batch: 100 units @ $10
                tracking: 'none',
            });

            // Mock: Existing inventory (100 units)
            mockPrismaService.productInventory.findMany.mockResolvedValue([
                { productId, quantity: 100 },
            ]);

            // Mock: Batch creation
            mockPrismaService.inventoryBatch.create.mockResolvedValue({
                id: 'batch-2',
                ...batchData,
            });

            // Mock: Existing inventory record
            mockPrismaService.productInventory.findFirst.mockResolvedValue({
                id: 'inv-1',
                productId,
                quantity: 100,
            });

            // Mock: Inventory update
            mockPrismaService.productInventory.update.mockResolvedValue({
                id: 'inv-1',
                quantity: 150,
            });

            // Mock: Transaction creation
            mockPrismaService.stockTransaction.create.mockResolvedValue({ id: 'tx-2' });

            await service.addBatch(batchData);

            // Calculate expected average:
            // Current: 100 units @ $10 = $1000
            // New:     50 units @ $15 = $750
            // Total:   150 units = $1750
            // Average: $1750 / 150 = $11.67
            const expectedAvg = (100 * 10 + 50 * 15) / (100 + 50);

            expect(mockPrismaService.product.update).toHaveBeenCalledWith({
                where: { id: productId },
                data: { averageCost: expectedAvg },
            });
        });

        it('should handle multiple inventory locations correctly', async () => {
            const productId = 'prod-1';
            const batchData = {
                productId,
                warehouseId: 'wh-2',
                locationId: 'loc-2',
                quantity: 30,
                costPerUnit: 12,
                purchaseDate: new Date(),
            };

            // Mock: Product with existing average
            mockPrismaService.product.findUnique.mockResolvedValue({
                id: productId,
                averageCost: 10,
                tracking: 'none',
            });

            // Mock: Inventory across multiple locations
            mockPrismaService.productInventory.findMany.mockResolvedValue([
                { productId, warehouseId: 'wh-1', quantity: 100 },
                { productId, warehouseId: 'wh-2', quantity: 50 },
            ]);

            mockPrismaService.inventoryBatch.create.mockResolvedValue({ id: 'batch-3' });
            mockPrismaService.productInventory.findFirst.mockResolvedValue({
                id: 'inv-2',
                quantity: 50,
            });
            mockPrismaService.productInventory.update.mockResolvedValue({ id: 'inv-2' });
            mockPrismaService.stockTransaction.create.mockResolvedValue({ id: 'tx-3' });

            await service.addBatch(batchData);

            // Expected: (150 total @ $10 avg) + (30 @ $12) = $1860 / 180 = $10.33
            const expectedAvg = (150 * 10 + 30 * 12) / (150 + 30);

            expect(mockPrismaService.product.update).toHaveBeenCalledWith({
                where: { id: productId },
                data: { averageCost: expect.closeTo(expectedAvg, 2) },
            });
        });

        it('should handle zero current inventory correctly', async () => {
            const productId = 'prod-1';
            const batchData = {
                productId,
                warehouseId: 'wh-1',
                quantity: 50,
                costPerUnit: 20,
                purchaseDate: new Date(),
            };

            // Mock: Product with no inventory (average cost might be old)
            mockPrismaService.product.findUnique.mockResolvedValue({
                id: productId,
                averageCost: 15, // Old average from depleted stock
                tracking: 'none',
            });

            // Mock: No current inventory
            mockPrismaService.productInventory.findMany.mockResolvedValue([]);

            mockPrismaService.inventoryBatch.create.mockResolvedValue({ id: 'batch-4' });
            mockPrismaService.productInventory.findFirst.mockResolvedValue(null);
            mockPrismaService.productInventory.create.mockResolvedValue({ id: 'inv-new' });
            mockPrismaService.stockTransaction.create.mockResolvedValue({ id: 'tx-4' });

            await service.addBatch(batchData);

            // With 0 current qty, new average should be the batch cost
            expect(mockPrismaService.product.update).toHaveBeenCalledWith({
                where: { id: productId },
                data: { averageCost: 20 },
            });
        });
    });
});
