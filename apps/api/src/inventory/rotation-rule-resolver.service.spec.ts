import { Test, TestingModule } from '@nestjs/testing';
import { RotationRuleResolverService } from './rotation-rule-resolver.service';
import { PrismaService } from '../prisma.service';

describe('RotationRuleResolverService', () => {
    let service: RotationRuleResolverService;
    let prisma: PrismaService;

    const mockPrisma = {
        rotationRule: {
            findMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RotationRuleResolverService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<RotationRuleResolverService>(RotationRuleResolverService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('resolveRule', () => {
        it('should return Default FIFO if no rules match context', async () => {
            mockPrisma.rotationRule.findMany.mockResolvedValue([]);

            const result = await service.resolveRule({ productId: 'P1', warehouseId: 'W1' });

            expect(result.policy).toBe('FIFO');
            expect(mockPrisma.rotationRule.findMany).toHaveBeenCalled();
        });

        it('should prioritize Customer Rule over Warehouse Default', async () => {
            const rules = [
                { id: '1', customerId: 'C1', policy: 'FEFO', priority: 0 },
                { id: '2', warehouseId: 'W1', policy: 'FIFO', priority: 0 }
            ];
            mockPrisma.rotationRule.findMany.mockResolvedValue(rules);

            const result = await service.resolveRule({ productId: 'P1', warehouseId: 'W1', customerId: 'C1' });

            expect(result.policy).toBe('FEFO');
            expect((result as any).id).toBe('1');
        });

        it('should prioritize SKU Rule over Category Rule', async () => {
            const rules = [
                { id: '1', categoryId: 'CatA', policy: 'FIFO', priority: 0 },
                { id: '2', productId: 'P1', policy: 'LIFO', priority: 0 }
            ];
            mockPrisma.rotationRule.findMany.mockResolvedValue(rules);

            const result = await service.resolveRule({ productId: 'P1', categoryId: 'CatA' });

            expect(result.policy).toBe('LIFO');
            expect((result as any).id).toBe('2');
        });

        it('should prioritize Order Type over SKU', async () => {
            const rules = [
                { id: '1', orderTypeId: 'B2B', policy: 'FEFO', priority: 0 },
                { id: '2', productId: 'P1', policy: 'FIFO', priority: 0 }
            ];
            mockPrisma.rotationRule.findMany.mockResolvedValue(rules);

            const result = await service.resolveRule({ productId: 'P1', orderTypeId: 'B2B' });

            expect(result.policy).toBe('FEFO');
            expect((result as any).id).toBe('1');
        });

        it('should match strictly on specified fields (filter check)', async () => {
            // Case: We search OR [warehouseId: W1], but rule is for W2.
            const rules = [
                { id: '1', warehouseId: 'W2', policy: 'LIFO', priority: 0 }
            ];
            mockPrisma.rotationRule.findMany.mockResolvedValue(rules);

            const result = await service.resolveRule({ productId: 'P1', warehouseId: 'W1' });

            // Should filter out W2 rule and return default
            expect(result.policy).toBe('FIFO');
        });
    });
});
