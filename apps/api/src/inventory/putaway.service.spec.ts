import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { PutawayService } from './putaway.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PutawayService - VENDOR Bug Fix', () => {
    let service: PutawayService;
    let prisma: PrismaService;

    const mockWarehouseId = 'test-warehouse-id';
    const mockWorkerId = 'test-worker-id';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PutawayService,
                {
                    provide: PrismaService,
                    useValue: {
                        warehouseFunctionalArea: {
                            findMany: jest.fn(),
                        },
                        location: {
                            findMany: jest.fn(),
                        },
                        receipt: {
                            findMany: jest.fn(),
                        },
                        putawaySession: {
                            create: jest.fn(),
                        },
                        putawayTask: {
                            create: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        service = module.get<PutawayService>(PutawayService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    describe('getReceivingLocationIds', () => {
        it('should use WarehouseFunctionalArea when available', async () => {
            const mockFunctionalAreas = [
                { id: '1', linkedLocationId: 'loc-1', areaType: 'RECEIVING', active: true },
                { id: '2', linkedLocationId: 'loc-2', areaType: 'STAGING', active: true },
            ];

            jest.spyOn(prisma.warehouseFunctionalArea, 'findMany').mockResolvedValue(mockFunctionalAreas as any);

            const result = await (service as any).getReceivingLocationIds(mockWarehouseId);

            expect(result).toEqual(['loc-1', 'loc-2']);
            expect(prisma.warehouseFunctionalArea.findMany).toHaveBeenCalledWith({
                where: {
                    warehouseId: mockWarehouseId,
                    areaType: { in: ['RECEIVING', 'STAGING'] },
                    active: true,
                    linkedLocationId: { not: null },
                },
            });
            // Should NOT fall back to location query
            expect(prisma.location.findMany).not.toHaveBeenCalled();
        });

        it('should fallback to naming convention when no functional areas', async () => {
            jest.spyOn(prisma.warehouseFunctionalArea, 'findMany').mockResolvedValue([]);

            const mockLocations = [
                { id: 'loc-receiving', name: 'Main Receiving', type: 'INTERNAL' },
                { id: 'loc-staging', name: 'Staging Bay', type: 'INTERNAL' },
            ];

            jest.spyOn(prisma.location, 'findMany').mockResolvedValue(mockLocations as any);

            const result = await (service as any).getReceivingLocationIds(mockWarehouseId);

            expect(result).toEqual(['loc-receiving', 'loc-staging']);
            expect(prisma.location.findMany).toHaveBeenCalledWith({
                where: {
                    warehouseId: mockWarehouseId,
                    type: 'INTERNAL', // ✅ INTERNAL not VENDOR
                    OR: expect.arrayContaining([
                        { name: { contains: 'RECEIVING' } },
                        { name: { contains: 'Receiving' } },
                        { name: { contains: 'STAGING' } },
                    ]),
                },
            });
        });

        it('should NOT use VENDOR type locations', async () => {
            jest.spyOn(prisma.warehouseFunctionalArea, 'findMany').mockResolvedValue([]);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([]);

            await (service as any).getReceivingLocationIds(mockWarehouseId);

            const locationCall = (prisma.location.findMany as jest.Mock).mock.calls[0][0];
            expect(locationCall.where.type).toBe('INTERNAL');
            expect(locationCall.where.OR).not.toContainEqual({ type: 'VENDOR' });
        });

        it('should return empty array when no receiving locations found', async () => {
            jest.spyOn(prisma.warehouseFunctionalArea, 'findMany').mockResolvedValue([]);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([]);

            const result = await (service as any).getReceivingLocationIds(mockWarehouseId);

            expect(result).toEqual([]);
        });
    });

    describe('createSession - PO flow', () => {
        it('should create putaway session for PO receipts', async () => {
            const receivingLocationId = 'loc-receiving';

            jest.spyOn(prisma.warehouseFunctionalArea, 'findMany').mockResolvedValue([
                { linkedLocationId: receivingLocationId, areaType: 'RECEIVING', active: true },
            ] as any);

            jest.spyOn(prisma.receipt, 'findMany').mockResolvedValue([
                {
                    id: 'receipt-1',
                    destinationLocationId: receivingLocationId,
                    status: 'DONE',
                    items: [{ id: 'item-1', productId: 'prod-1', quantity: 10, product: { id: 'prod-1' } }],
                    destinationLocation: { id: receivingLocationId },
                },
            ] as any);

            jest.spyOn(prisma.putawaySession, 'create').mockResolvedValue({ id: 'session-1' } as any);
            jest.spyOn(service, 'findBestLocation').mockResolvedValue({ id: 'storage-loc-1' } as any);
            jest.spyOn(prisma.putawayTask, 'create').mockResolvedValue({} as any);
            jest.spyOn(service, 'getActiveSession').mockResolvedValue({ id: 'session-1' } as any);

            await service.createSession(mockWarehouseId, mockWorkerId);

            expect(prisma.putawaySession.create).toHaveBeenCalled();
        });
    });

    describe('createSession - IWT flow', () => {
        it('should create putaway session for IWT receipts (no VENDOR involved)', async () => {
            const receivingLocationId = 'loc-receiving-iwt';

            // IWT uses INTERNAL receiving location, not VENDOR
            jest.spyOn(prisma.warehouseFunctionalArea, 'findMany').mockResolvedValue([
                { linkedLocationId: receivingLocationId, areaType: 'RECEIVING', active: true },
            ] as any);

            jest.spyOn(prisma.receipt, 'findMany').mockResolvedValue([
                {
                    id: 'receipt-iwt-1',
                    destinationLocationId: receivingLocationId,
                    status: 'DONE',
                    items: [{ id: 'item-1', productId: 'prod-1', quantity: 5, product: { id: 'prod-1' } }],
                    destinationLocation: { id: receivingLocationId },
                },
            ] as any);

            jest.spyOn(prisma.putawaySession, 'create').mockResolvedValue({ id: 'session-iwt' } as any);
            jest.spyOn(service, 'findBestLocation').mockResolvedValue({ id: 'storage-loc-1' } as any);
            jest.spyOn(prisma.putawayTask, 'create').mockResolvedValue({} as any);
            jest.spyOn(service, 'getActiveSession').mockResolvedValue({ id: 'session-iwt' } as any);

            await service.createSession(mockWarehouseId, mockWorkerId);

            expect(prisma.putawaySession.create).toHaveBeenCalled();
        });
    });

    describe('createSession - error handling', () => {
        it('should throw error when no receiving locations found', async () => {
            jest.spyOn(prisma.warehouseFunctionalArea, 'findMany').mockResolvedValue([]);
            jest.spyOn(prisma.location, 'findMany').mockResolvedValue([]);

            await expect(service.createSession(mockWarehouseId, mockWorkerId)).rejects.toThrow(HttpException);
            await expect(service.createSession(mockWarehouseId, mockWorkerId)).rejects.toThrow(
                'No receiving/staging areas found'
            );
        });
    });
});
