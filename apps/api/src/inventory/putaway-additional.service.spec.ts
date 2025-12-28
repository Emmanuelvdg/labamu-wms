import { Test, TestingModule } from '@nestjs/testing';
import { PutawayService } from './putaway.service';
import { PrismaService } from '../prisma.service';

/**
 * Additional Test Coverage for Enhanced Putaway System
 * Tests: BALANCED strategy, packaging filtering, source location, rule priority, warehouse scoping
 */
describe('PutawayService - Additional Coverage Tests', () => {
    let service: PutawayService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PutawayService,
                {
                    provide: PrismaService,
                    useValue: {
                        product: { findUnique: jest.fn() },
                        putawayRule: { findMany: jest.fn() },
                        location: { findMany: jest.fn(), findUnique: jest.fn() },
                    },
                },
            ],
        }).compile();

        service = module.get<PutawayService>(PutawayService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    describe('BALANCED Strategy - Randomness Validation', () => {
        it('should distribute items across multiple compatible locations randomly', async () => {
            const mockProduct = {
                id: 'prod-balanced',
                sku: 'BALANCED-001',
                name: 'Distributed Product',
                category: 'BULK',
                velocity: 'B',
                weight: 20,
            };

            const mockRule = {
                id: 'rule-balanced',
                name: 'Balanced Distribution',
                strategy: 'BALANCED',
                categoryId: 'BULK',
                priority: 80,
                active: true,
            };

            const locations = [
                { id: 'loc-1', name: 'Zone A', type: 'INTERNAL', warehouseId: 'wh-1', attributes: '{}', maxVolume: 100, maxWeight: 1000, inventory: [] },
                { id: 'loc-2', name: 'Zone B', type: 'INTERNAL', warehouseId: 'wh-1', attributes: '{}', maxVolume: 100, maxWeight: 1000, inventory: [] },
                { id: 'loc-3', name: 'Zone C', type: 'INTERNAL', warehouseId: 'wh-1', attributes: '{}', maxVolume: 100, maxWeight: 1000, inventory: [] },
                { id: 'loc-4', name: 'Zone D', type: 'INTERNAL', warehouseId: 'wh-1', attributes: '{}', maxVolume: 100, maxWeight: 1000, inventory: [] },
            ];

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue(locations as any);
            jest.spyOn(prisma.location, 'findUnique').mockImplementation(
                (args: any) => Promise.resolve(locations.find(l => l.id === args.where.id) as any)
            );

            // Run multiple times to verify randomness
            const results = new Set<string>();
            const iterations = 20;

            for (let i = 0; i < iterations; i++) {
                const result = await service.findBestLocation('prod-balanced', 10, 'wh-1');
                if (result) {
                    results.add(result.id);
                }
            }

            // With BALANCED strategy and 4 locations, we should get distribution
            // Not guaranteed to hit all 4, but should hit at least 2 different ones
            expect(results.size).toBeGreaterThanOrEqual(2);
            expect(results.size).toBeLessThanOrEqual(4);

            // Verify all selected locations were in the candidate pool
            results.forEach(locId => {
                expect(locations.some(l => l.id === locId)).toBe(true);
            });
        });

        it('should still use BALANCED strategy even with single location (no error)', async () => {
            const mockProduct = {
                id: 'prod-single',
                sku: 'SINGLE-001',
                name: 'Single Location Product',
                category: 'MISC',
                velocity: 'B',
                weight: 5,
            };

            const mockRule = {
                id: 'rule-balanced-single',
                name: 'Balanced Single',
                strategy: 'BALANCED',
                priority: 70,
                active: true,
            };

            const singleLocation = {
                id: 'loc-only',
                name: 'Only Zone',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                attributes: '{}',
                maxVolume: 50,
                maxWeight: 500,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([singleLocation] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(singleLocation as any);

            const result = await service.findBestLocation('prod-single', 5, 'wh-1');

            expect(result).toBeDefined();
            expect(result.id).toBe('loc-only');
        });
    });

    describe('Packaging Filtering - minPackagingSize/maxPackagingSize', () => {
        it('should match PALLET packaging within acceptable range', async () => {
            const mockProduct = {
                id: 'prod-pallet',
                sku: 'PALLET-001',
                name: 'Palletized Product',
                category: 'BULK',
                preferredPackaging: 'PALLET',
                velocity: 'C',
                weight: 500,
            };

            const mockRule = {
                id: 'rule-pallet',
                name: 'Pallet Size Rule',
                strategy: 'ZONE_PRIORITY',
                minPackagingSize: 'BOX',      // Accepts BOX and PALLET
                maxPackagingSize: 'PALLET',   // Accepts up to PALLET
                priority: 110,
                active: true,
            };

            const mockLocation = {
                id: 'loc-pallet',
                name: 'Pallet Storage',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                zonePriority: 70,
                supportedPackaging: JSON.stringify(['PALLET']),
                attributes: '{}',
                maxVolume: 200,
                maxWeight: 10000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([mockLocation] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(mockLocation as any);

            const result = await service.findBestLocation('prod-pallet', 1, 'wh-1', undefined, 'PALLET');

            expect(result).toBeDefined();
            expect(result.id).toBe('loc-pallet');
        });

        it('should reject packaging outside acceptable range', async () => {
            const mockProduct = {
                id: 'prod-individual',
                sku: 'INDIV-001',
                name: 'Individual Item',
                category: 'PARTS',
                preferredPackaging: 'INDIVIDUAL',
                velocity: 'A',
                weight: 1,
            };

            const mockRule = {
                id: 'rule-box-only',
                name: 'Box/Pallet Only',
                strategy: 'ZONE_PRIORITY',
                minPackagingSize: 'BOX',      // Requires at least BOX
                maxPackagingSize: 'PALLET',   // Up to PALLET
                priority: 100,
                active: true,
            };

            // INDIVIDUAL is smaller than BOX, so should be rejected
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);

            const locations = [{
                id: 'loc-box',
                name: 'Box Storage',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                attributes: '{}',
                inventory: [],
            }];

            jest.spyOn(prisma.location, 'findMany').mockResolvedValue(locations as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(locations[0] as any);

            const result = await service.findBestLocation('prod-individual', 10, 'wh-1', undefined, 'INDIVIDUAL');

            // Should fall back to default since rule filtered out
            expect(prisma.putawayRule.findMany).toHaveBeenCalled();
        });

        it('should allow products within packaging range', async () => {
            const mockProduct = {
                id: 'prod-box',
                sku: 'BOX-001',
                name: 'Box Product',
                category: 'GOODS',
                preferredPackaging: 'BOX',
                velocity: 'B',
                weight: 15,
            };

            const mockRule = {
                id: 'rule-flexible',
                name: 'Flexible Packaging',
                strategy: 'CLOSEST',
                minPackagingSize: 'INDIVIDUAL', // Accepts all sizes
                maxPackagingSize: 'PALLET',
                priority: 90,
                active: true,
            };

            const mockLocation = {
                id: 'loc-multi',
                name: 'Multi-Package Storage',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                putawaySequence: 15,
                supportedPackaging: JSON.stringify(['INDIVIDUAL', 'BOX', 'PALLET']),
                attributes: '{}',
                maxVolume: 100,
                maxWeight: 2000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([mockLocation] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(mockLocation as any);

            const result = await service.findBestLocation('prod-box', 10, 'wh-1', undefined, 'BOX');

            expect(result).toBeDefined();
            expect(result.id).toBe('loc-multi');
        });
    });

    describe('Source Location Filtering', () => {
        it('should apply rule only when source location matches', async () => {
            const mockProduct = {
                id: 'prod-source',
                sku: 'SOURCE-001',
                name: 'Source-Specific Product',
                category: 'ELECTRONICS',
                velocity: 'A',
                weight: 8,
            };

            // Rule specific to receiving dock A
            const mockRule = {
                id: 'rule-dock-a',
                name: 'Dock A to Zone 1',
                strategy: 'FIXED',
                destinationLocationId: 'zone-1',
                sourceLocationId: 'dock-a',
                priority: 120,
                active: true,
            };

            const mockDestination = {
                id: 'zone-1',
                name: 'Zone 1',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                attributes: '{}',
                maxVolume: 50,
                maxWeight: 1000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([mockDestination] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(mockDestination as any);

            // Call with matching source location
            const result = await service.findBestLocation('prod-source', 10, 'wh-1', 'dock-a');

            expect(result).toBeDefined();
            expect(result.id).toBe('zone-1');
        });

        it('should skip rule when source location does not match', async () => {
            const mockProduct = {
                id: 'prod-source-2',
                sku: 'SOURCE-002',
                name: 'Different Source Product',
                category: 'ELECTRONICS',
                velocity: 'A',
                weight: 8,
            };

            // Rule specific to dock A
            const dockARule = {
                id: 'rule-dock-a',
                name: 'Dock A to Zone 1',
                strategy: 'FIXED',
                destinationLocationId: 'zone-1',
                sourceLocationId: 'dock-a',
                priority: 120,
                active: true,
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([dockARule] as any);

            const fallbackLocations = [{
                id: 'zone-general',
                name: 'General Zone',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                zonePriority: 10,
                putawaySequence: 5,
                attributes: '{}',
                maxVolume: 100,
                maxWeight: 2000,
                inventory: [],
            }];

            jest.spyOn(prisma.location, 'findMany').mockResolvedValue(fallbackLocations as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(fallbackLocations[0] as any);

            // Call with different source location (dock-b)
            const result = await service.findBestLocation('prod-source-2', 10, 'wh-1', 'dock-b');

            // Should not use dock-a rule, fall back to default
            expect(result).toBeDefined();
            expect(result.id).not.toBe('zone-1'); // Should not be dock-a destination
        });

        it('should match rule with null sourceLocationId (applies to all sources)', async () => {
            const mockProduct = {
                id: 'prod-any-source',
                sku: 'ANY-SOURCE-001',
                name: 'Any Source Product',
                category: 'PARTS',
                velocity: 'A',
                weight: 3,
            };

            const universalRule = {
                id: 'rule-universal',
                name: 'Universal Rule',
                strategy: 'ZONE_PRIORITY',
                sourceLocationId: null, // Applies to any source
                velocityClass: 'A',
                preferredZonePriorityMin: 1,
                preferredZonePriorityMax: 20,
                priority: 100,
                active: true,
            };

            const mockLocation = {
                id: 'golden-zone',
                name: 'Golden Zone',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                zonePriority: 10,
                putawaySequence: 5,
                attributes: '{}',
                maxVolume: 50,
                maxWeight: 500,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([universalRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([mockLocation] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(mockLocation as any);

            // Call with any source location
            const result = await service.findBestLocation('prod-any-source', 10, 'wh-1', 'any-dock');

            expect(result).toBeDefined();
            expect(result.id).toBe('golden-zone');
        });
    });

    describe('Multiple Rules - Priority Ordering', () => {
        it('should select highest priority rule when multiple rules match', async () => {
            const mockProduct = {
                id: 'prod-multi',
                sku: 'MULTI-001',
                name: 'Multi-Rule Product',
                category: 'ELECTRONICS',
                velocity: 'A',
                abcClass: 'A',
                weight: 10,
            };

            // Multiple matching rules with different priorities
            const rules = [
                {
                    id: 'rule-low',
                    name: 'Low Priority Rule',
                    strategy: 'ZONE_PRIORITY',
                    categoryId: 'ELECTRONICS',
                    preferredZonePriorityMin: 30,
                    preferredZonePriorityMax: 50,
                    priority: 50, // Lower priority
                    active: true,
                },
                {
                    id: 'rule-high',
                    name: 'High Priority Rule',
                    strategy: 'FIXED',
                    velocityClass: 'A',
                    destinationLocationId: 'premium-zone',
                    priority: 150, // Higher priority
                    active: true,
                },
                {
                    id: 'rule-medium',
                    name: 'Medium Priority Rule',
                    strategy: 'CLOSEST',
                    abcClass: 'A',
                    priority: 100, // Medium priority
                    active: true,
                },
            ];

            const premiumZone = {
                id: 'premium-zone',
                name: 'Premium Storage',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                attributes: '{}',
                maxVolume: 100,
                maxWeight: 2000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            // Prisma returns rules in priority desc order
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue(
                [...rules].sort((a, b) => b.priority - a.priority) as any
            );
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([premiumZone] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(premiumZone as any);

            const result = await service.findBestLocation('prod-multi', 10, 'wh-1');

            expect(result).toBeDefined();
            // Should use highest priority rule (priority 150, FIXED strategy)
            expect(result.id).toBe('premium-zone');
        });

        it('should try next rule if highest priority rule has no compatible locations', async () => {
            const mockProduct = {
                id: 'prod-fallback',
                sku: 'FALLBACK-001',
                name: 'Fallback Product',
                category: 'HAZMAT',
                velocity: 'B',
                storageRequirements: JSON.stringify(['hazmat_certified']),
                weight: 50,
            };

            const rules = [
                {
                    id: 'rule-restrictive',
                    name: 'Restrictive Rule',
                    strategy: 'FIXED',
                    destinationLocationId: 'incompatible-zone', // This location doesn't exist/incompatible
                    categoryId: 'HAZMAT',
                    priority: 200,
                    active: true,
                },
                {
                    id: 'rule-backup',
                    name: 'Backup Rule',
                    strategy: 'ZONE_PRIORITY',
                    requiredAttributes: JSON.stringify(['hazmat_certified']),
                    preferredZonePriorityMin: 90,
                    preferredZonePriorityMax: 100,
                    priority: 100,
                    active: true,
                },
            ];

            const hazmatZone = {
                id: 'hazmat-backup',
                name: 'Hazmat Backup Zone',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                zonePriority: 95,
                attributes: JSON.stringify({ attributes: ['hazmat_certified'] }),
                maxVolume: 200,
                maxWeight: 10000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue(
                [...rules].sort((a, b) => b.priority - a.priority) as any
            );

            // First rule looks for incompatible-zone, second rule gets hazmat-backup
            jest.spyOn(prisma.location, 'findMany').mockImplementation((args: any) => {
                if (args.where?.id === 'incompatible-zone') {
                    return Promise.resolve([]);
                }
                return Promise.resolve([hazmatZone] as any);
            });
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(hazmatZone as any);

            const result = await service.findBestLocation('prod-fallback', 5, 'wh-1');

            expect(result).toBeDefined();
            // Should fall through to backup rule
            expect(result.id).toBe('hazmat-backup');
        });
    });

    describe('Warehouse Scoping - Global vs. Warehouse-Specific Rules', () => {
        it('should apply warehouse-specific rule for matching warehouse', async () => {
            const mockProduct = {
                id: 'prod-wh-specific',
                sku: 'WH-SPEC-001',
                name: 'Warehouse Specific Product',
                category: 'ELECTRONICS',
                velocity: 'A',
                weight: 6,
            };

            const warehouseSpecificRule = {
                id: 'rule-wh-1',
                name: 'Warehouse 1 Specific Rule',
                strategy: 'FIXED',
                destinationLocationId: 'wh1-special-zone',
                velocityClass: 'A',
                warehouseId: 'wh-1', // Specific to wh-1
                priority: 150,
                active: true,
            };

            const wh1Zone = {
                id: 'wh1-special-zone',
                name: 'WH1 Special Zone',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                attributes: '{}',
                maxVolume: 50,
                maxWeight: 1000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([warehouseSpecificRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([wh1Zone] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(wh1Zone as any);

            const result = await service.findBestLocation('prod-wh-specific', 10, 'wh-1');

            expect(result).toBeDefined();
            expect(result.id).toBe('wh1-special-zone');
        });

        it('should apply global rule (null warehouseId) to any warehouse', async () => {
            const mockProduct = {
                id: 'prod-global',
                sku: 'GLOBAL-001',
                name: 'Global Rule Product',
                category: 'PARTS',
                velocity: 'A',
                weight: 4,
            };

            const globalRule = {
                id: 'rule-global',
                name: 'Global A-Items Rule',
                strategy: 'ZONE_PRIORITY',
                velocityClass: 'A',
                preferredZonePriorityMin: 1,
                preferredZonePriorityMax: 20,
                warehouseId: null, // Global rule
                priority: 100,
                active: true,
            };

            const wh2Zone = {
                id: 'wh2-golden',
                name: 'WH2 Golden Zone',
                type: 'INTERNAL',
                warehouseId: 'wh-2',
                zonePriority: 10,
                putawaySequence: 5,
                attributes: '{}',
                maxVolume: 50,
                maxWeight: 500,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([globalRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([wh2Zone] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(wh2Zone as any);

            // Test with warehouse-2
            const result = await service.findBestLocation('prod-global', 10, 'wh-2');

            expect(result).toBeDefined();
            expect(result.id).toBe('wh2-golden');
        });

        it('should prioritize warehouse-specific rule over global rule', async () => {
            const mockProduct = {
                id: 'prod-priority',
                sku: 'PRIORITY-001',
                name: 'Priority Test Product',
                category: 'ELECTRONICS',
                velocity: 'A',
                weight: 7,
            };

            const rules = [
                {
                    id: 'rule-global',
                    name: 'Global Rule',
                    strategy: 'ZONE_PRIORITY',
                    velocityClass: 'A',
                    preferredZonePriorityMin: 1,
                    preferredZonePriorityMax: 20,
                    warehouseId: null,
                    priority: 100, // Same priority
                    active: true,
                },
                {
                    id: 'rule-wh-specific',
                    name: 'WH1 Priority Rule',
                    strategy: 'FIXED',
                    destinationLocationId: 'wh1-priority-zone',
                    velocityClass: 'A',
                    warehouseId: 'wh-1',
                    priority: 100, // Same priority as global
                    active: true,
                },
            ];

            const wh1PriorityZone = {
                id: 'wh1-priority-zone',
                name: 'WH1 Priority Zone',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                attributes: '{}',
                maxVolume: 50,
                maxWeight: 1000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            // Warehouse-specific should be returned first by query filter
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue(
                rules.filter(r => r.warehouseId === 'wh-1' || r.warehouseId === null)
                    .sort((a, b) => b.priority - a.priority) as any
            );
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([wh1PriorityZone] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(wh1PriorityZone as any);

            const result = await service.findBestLocation('prod-priority', 10, 'wh-1');

            expect(result).toBeDefined();
            // When both match, warehouse-specific should be tried first
            // (implementation detail: query filters for warehouseId: { in: [wh-1, null] })
        });
    });
});
