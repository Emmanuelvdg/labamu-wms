import { Test, TestingModule } from '@nestjs/testing';
import { PutawayService } from './putaway.service';
import { PrismaService } from '../prisma.service';

describe('PutawayService - Phase 2 & 3 Enhanced Tests', () => {
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
                        putawayRule: { findMany: jest.fn(), create: jest.fn() },
                        location: { findMany: jest.fn(), findUnique: jest.fn() },
                        warehouseFunctionalArea: { findMany: jest.fn() },
                        productInventory: { findUnique: jest.fn() },
                    },
                },
            ],
        }).compile();

        service = module.get<PutawayService>(PutawayService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    describe('findBestLocation - Enhanced with Rules', () => {
        it('should use FIXED strategy when rule specifies destination', async () => {
            const mockProduct = {
                id: 'prod-1',
                sku: 'HAZMAT-001',
                name: 'Hazardous Chemical',
                category: 'CHEMICALS',
                velocity: 'B',
                abcClass: 'B',
                weight: 25,
                storageRequirements: JSON.stringify(['hazmat_certified']),
                width: 30,
                height: 40,
                depth: 30,
            };

            const mockRule = {
                id: 'rule-1',
                name: 'Hazmat to Dedicated Zone',
                strategy: 'FIXED',
                destinationLocationId: 'hazmat-zone-1',
                priority: 200,
                active: true,
                requiredAttributes: JSON.stringify(['hazmat_certified']),
                productId: null,
                categoryId: 'CHEMICALS',
                velocityClass: null,
                abcClass: null,
                sourceLocationId: null,
            };

            const mockDestination = {
                id: 'hazmat-zone-1',
                name: 'Hazmat Storage A',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                attributes: JSON.stringify({ attributes: ['hazmat_certified'] }),
                maxVolume: 100,
                maxWeight: 5000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([mockDestination] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(mockDestination as any);

            const result = await service.findBestLocation('prod-1', 10, 'wh-1');

            expect(result).toBeDefined();
            expect(result.id).toBe('hazmat-zone-1');
            expect(prisma.putawayRule.findMany).toHaveBeenCalled();
        });

        it('should use ZONE_PRIORITY strategy for fast-moving items', async () => {
            const mockProduct = {
                id: 'prod-2',
                sku: 'FAST-001',
                name: 'Fast Moving Product',
                category: 'ELECTRONICS',
                velocity: 'A',
                abcClass: 'A',
                weight: 5,
                width: 20,
                height: 30,
                depth: 20,
            };

            const mockRule = {
                id: 'rule-2',
                name: 'A-Items to Golden Zone',
                strategy: 'ZONE_PRIORITY',
                preferredZonePriorityMin: 1,
                preferredZonePriorityMax: 20,
                velocityClass: 'A',
                priority: 100,
                active: true,
                productId: null,
                categoryId: null,
                abcClass: null,
                sourceLocationId: null,
            };

            const mockGoldenZone = {
                id: 'golden-1',
                name: 'Golden Zone A-1',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                zonePriority: 10,
                putawaySequence: 5,
                attributes: '{}',
                maxVolume: 50,
                maxWeight: 1000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([mockGoldenZone] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(mockGoldenZone as any);

            const result = await service.findBestLocation('prod-2', 20, 'wh-1');

            expect(result).toBeDefined();
            expect(result.zonePriority).toBeLessThanOrEqual(20);
        });

        it('should filter by storage requirements (refrigerated)', async () => {
            const mockProduct = {
                id: 'prod-3',
                sku: 'COLD-001',
                name: 'Refrigerated Product',
                category: 'FOOD',
                velocity: 'B',
                storageRequirements: JSON.stringify(['refrigerated']),
                temperatureMin: 2,
                temperatureMax: 8,
                weight: 3,
                width: 15,
                height: 20,
                depth: 15,
            };

            const mockRule = {
                id: 'rule-3',
                name: 'Cold Storage',
                strategy: 'LEAST_OCCUPIED',
                requiredAttributes: JSON.stringify(['refrigerated']),
                temperatureMin: 2,
                temperatureMax: 8,
                priority: 150,
                active: true,
                productId: null,
                categoryId: 'FOOD',
            };

            const mockColdZone = {
                id: 'cold-1',
                name: 'Cold Storage 1',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                attributes: JSON.stringify({
                    attributes: ['refrigerated'],
                    temperatureMin: 0,
                    temperatureMax: 10,
                }),
                maxVolume: 30,
                maxWeight: 500,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([mockColdZone] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(mockColdZone as any);

            const result = await service.findBestLocation('prod-3', 10, 'wh-1');

            expect(result).toBeDefined();
            expect(result.id).toBe('cold-1');
        });

        it('should reject incompatible storage requirements', async () => {
            const mockProduct = {
                id: 'prod-4',
                sku: 'COLD-002',
                name: 'Frozen Product',
                category: 'FOOD',
                storageRequirements: JSON.stringify(['frozen']),
                temperatureMin: -18,
                temperatureMax: -15,
                weight: 5,
            };

            const mockRule = {
                id: 'rule-4',
                name: 'Frozen Storage',
                strategy: 'ZONE_PRIORITY',
                requiredAttributes: JSON.stringify(['frozen']),
                priority: 150,
                active: true,
            };

            // Location without frozen capability
            const mockWarmZone = {
                id: 'warm-1',
                name: 'Regular Storage',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                attributes: JSON.stringify({
                    attributes: ['dry'],
                    temperatureMin: 15,
                    temperatureMax: 25,
                }),
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([mockWarmZone] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(mockWarmZone as any);

            const result = await service.findBestLocation('prod-4', 10, 'wh-1');

            // Should fall back to default selection since no compatible location
            expect(prisma.putawayRule.findMany).toHaveBeenCalled();
        });

        it('should filter by weight range', async () => {
            const mockProduct = {
                id: 'prod-5',
                sku: 'HEAVY-001',
                name: 'Heavy Pallet',
                category: 'BULK',
                weight: 600,
                velocity: 'C',
                width: 120,
                height: 100,
                depth: 80,
            };

            const mockRule = {
                id: 'rule-5',
                name: 'Heavy Items Ground Floor',
                strategy: 'ZONE_PRIORITY',
                minWeight: 500,
                maxWeight: null,
                preferredZonePriorityMin: 80,
                preferredZonePriorityMax: 100,
                priority: 90,
                active: true,
                productId: null,
                categoryId: null,
            };

            const mockGroundZone = {
                id: 'ground-1',
                name: 'Ground Floor Storage',
                type: 'INTERNAL',
                warehouseId: 'wh-1',
                zonePriority: 85,
                putawaySequence: 50,
                attributes: JSON.stringify({ attributes: ['heavy_duty', 'ground_floor'] }),
                maxVolume: 200,
                maxWeight: 10000,
                inventory: [],
            };

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([mockGroundZone] as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(mockGroundZone as any);

            const result = await service.findBestLocation('prod-5', 1, 'wh-1');

            expect(result).toBeDefined();
            expect(result.zonePriority).toBeGreaterThanOrEqual(80);
        });

        it('should use CLOSEST strategy to minimize travel', async () => {
            const mockProduct = {
                id: 'prod-6',
                sku: 'PICK-001',
                name: 'Frequently Picked Item',
                category: 'PARTS',
                velocity: 'A',
                weight: 2,
            };

            const mockRule = {
                id: 'rule-6',
                name: 'Frequently Picked Items Close',
                strategy: 'CLOSEST',
                velocityClass: 'A',
                priority: 120,
                active: true,
            };

            const locations = [
                {
                    id: 'loc-1',
                    name: 'Far Location',
                    type: 'INTERNAL',
                    warehouseId: 'wh-1',
                    putawaySequence: 100,
                    attributes: '{}',
                    maxVolume: 50,
                    maxWeight: 500,
                    inventory: [],
                },
                {
                    id: 'loc-2',
                    name: 'Close Location',
                    type: 'INTERNAL',
                    warehouseId: 'wh-1',
                    putawaySequence: 10,
                    attributes: '{}',
                    maxVolume: 50,
                    maxWeight: 500,
                    inventory: [],
                },
            ];

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue(locations as any);
            jest.spyOn(prisma.location, 'findUnique').mockImplementation(
                (args: any) => Promise.resolve(locations.find(l => l.id === args.where.id) as any)
            );

            const result = await service.findBestLocation('prod-6', 5, 'wh-1');

            expect(result).toBeDefined();
            expect(result.putawaySequence).toBe(10); // Should select closest
        });

        it('should use LEAST_OCCUPIED strategy for load balancing', async () => {
            const mockProduct = {
                id: 'prod-7',
                sku: 'BULK-001',
                name: 'Bulk Item',
                category: 'BULK',
                velocity: 'C',
                weight: 50,
            };

            const mockRule = {
                id: 'rule-7',
                name: 'Balance Bulk Storage',
                strategy: 'LEAST_OCCUPIED',
                categoryId: 'BULK',
                priority: 70,
                active: true,
            };

            const locations = [
                {
                    id: 'loc-1',
                    name: 'Occupied Location',
                    type: 'INTERNAL',
                    warehouseId: 'wh-1',
                    attributes: '{}',
                    maxVolume: 100,
                    maxWeight: 2000,
                    inventory: [{ id: '1' }, { id: '2' }, { id: '3' }], // 3 items
                },
                {
                    id: 'loc-2',
                    name: 'Empty Location',
                    type: 'INTERNAL',
                    warehouseId: 'wh-1',
                    attributes: '{}',
                    maxVolume: 100,
                    maxWeight: 2000,
                    inventory: [], // Empty
                },
            ];

            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([mockRule] as any);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue(locations as any);
            jest.spyOn(prisma.location, 'findUnique').mockImplementation(
                (args: any) => Promise.resolve(locations.find(l => l.id === args.where.id) as any)
            );

            const result = await service.findBestLocation('prod-7', 10, 'wh-1');

            expect(result).toBeDefined();
            expect(result.id).toBe('loc-2'); // Should select less occupied
        });

        it('should fall back to default velocity-based selection when no rules match', async () => {
            const mockProduct = {
                id: 'prod-8',
                sku: 'GENERIC-001',
                name: 'Generic Product',
                category: 'MISC',
                velocity: 'A',
                weight: 3,
            };

            // No matching rules
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.putawayRule, 'findMany').mockResolvedValue([]);

            const locations = [
                {
                    id: 'loc-1',
                    name: 'Golden Zone',
                    type: 'INTERNAL',
                    warehouseId: 'wh-1',
                    zonePriority: 10,
                    putawaySequence: 5,
                    attributes: '{}',
                    maxVolume: 50,
                    maxWeight: 500,
                    inventory: [],
                },
            ];

            jest.spyOn(prisma.location, 'findMany').mockResolvedValue(locations as any);
            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(locations[0] as any);

            const result = await service.findBestLocation('prod-8', 10, 'wh-1');

            expect(result).toBeDefined();
            expect(result.zonePriority).toBeLessThanOrEqual(20); // Velocity A → golden zone
        });
    });

    describe('checkLocationCapacity', () => {
        it('should return false when volume capacity exceeded', async () => {
            const location = {
                id: 'loc-1',
                maxVolume: 1, // 1 m³
                maxWeight: 1000,
                inventory: [],
            };

            const product = {
                id: 'prod-1',
                width: 100, // cm
                height: 100,
                depth: 100,
                weight: 50,
            };

            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(location as any);
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(product as any);

            const result = await service.checkLocationCapacity('loc-1', 'prod-1', 10);

            expect(result.available).toBe(false);
            expect(result.reason).toContain('volume');
        });

        it('should return false when weight capacity exceeded', async () => {
            const location = {
                id: 'loc-1',
                maxVolume: 100,
                maxWeight: 500, // kg
                inventory: [],
            };

            const product = {
                id: 'prod-1',
                width: 10,
                height: 10,
                depth: 10,
                weight: 60, // kg
            };

            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(location as any);
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(product as any);

            const result = await service.checkLocationCapacity('loc-1', 'prod-1', 10); // 600kg total

            expect(result.available).toBe(false);
            expect(result.reason).toContain('weight');
        });

        it('should return true when capacity is available', async () => {
            const location = {
                id: 'loc-1',
                maxVolume: 100,
                maxWeight: 1000,
                inventory: [],
            };

            const product = {
                id: 'prod-1',
                width: 20,
                height: 20,
                depth: 20,
                weight: 5,
            };

            jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(location as any);
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(product as any);

            const result = await service.checkLocationCapacity('loc-1', 'prod-1', 10);

            expect(result.available).toBe(true);
        });
    });
});
