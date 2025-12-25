import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { PrismaService } from '../../prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

describe('PermissionsGuard', () => {
    let guard: PermissionsGuard;
    let prisma: PrismaService;
    let reflector: Reflector;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsGuard,
                {
                    provide: PrismaService,
                    useValue: {
                        user: {
                            findUnique: jest.fn(),
                        },
                    },
                },
                {
                    provide: Reflector,
                    useValue: {
                        getAllAndOverride: jest.fn(),
                    },
                },
            ],
        }).compile();

        guard = module.get<PermissionsGuard>(PermissionsGuard);
        prisma = module.get<PrismaService>(PrismaService);
        reflector = module.get<Reflector>(Reflector);
    });

    const createMockExecutionContext = (userId?: string): ExecutionContext => {
        const mockRequest = {
            headers: userId ? { 'x-user-id': userId } : {},
            user: undefined,
        };

        return {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        } as ExecutionContext;
    };

    describe('No Permission Required', () => {
        it('should allow access when no permission decorator is present', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
            const context = createMockExecutionContext('user-123');

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });
    });

    describe('User Identification', () => {
        it('should throw UnauthorizedException when x-user-id header is missing', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'INVENTORY',
                action: 'CREATE',
            });
            const context = createMockExecutionContext();

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('User not identified');
        });

        it('should throw UnauthorizedException when user is not found', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'INVENTORY',
                action: 'CREATE',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
            const context = createMockExecutionContext('nonexistent-user');

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('User not found');
        });

        it('should throw ForbiddenException when user has no roles', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'INVENTORY',
                action: 'CREATE',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
                id: 'user-123',
                email: 'test@example.com',
                roles: [],
                warehouses: [],
            } as any);
            const context = createMockExecutionContext('user-123');

            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
            await expect(guard.canActivate(context)).rejects.toThrow('User has no roles assigned');
        });
    });

    describe('Wildcard Permissions', () => {
        it('should allow access with * resource and * action', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'INVENTORY',
                action: 'CREATE',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
                id: 'admin-user',
                email: 'admin@example.com',
                roles: [
                    {
                        id: 'admin-role',
                        name: 'Admin',
                        permissions: [{ resource: '*', action: '*' }],
                    },
                ],
                warehouses: [],
            } as any);
            const context = createMockExecutionContext('admin-user');

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });

        it('should allow access with ALL resource and MANAGE action', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'INVENTORY',
                action: 'DELETE',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
                id: 'super-admin',
                email: 'superadmin@example.com',
                roles: [
                    {
                        id: 'super-role',
                        name: 'SuperAdmin',
                        permissions: [{ resource: 'ALL', action: 'MANAGE' }],
                    },
                ],
                warehouses: [],
            } as any);
            const context = createMockExecutionContext('super-admin');

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });

        it('should allow access with wildcard resource for specific action', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'INVENTORY',
                action: 'READ',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
                id: 'viewer',
                email: 'viewer@example.com',
                roles: [
                    {
                        id: 'viewer-role',
                        name: 'Viewer',
                        permissions: [{ resource: '*', action: 'READ' }],
                    },
                ],
                warehouses: [],
            } as any);
            const context = createMockExecutionContext('viewer');

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });
    });

    describe('Specific Permissions', () => {
        it('should allow access with exact permission match', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'INVENTORY',
                action: 'CREATE',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
                id: 'warehouse-manager',
                email: 'manager@example.com',
                roles: [
                    {
                        id: 'manager-role',
                        name: 'Warehouse Manager',
                        permissions: [
                            { resource: 'INVENTORY', action: 'CREATE' },
                            { resource: 'INVENTORY', action: 'UPDATE' },
                        ],
                    },
                ],
                warehouses: [],
            } as any);
            const context = createMockExecutionContext('warehouse-manager');

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });

        it('should deny access when permission does not match', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'INVENTORY',
                action: 'DELETE',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
                id: 'worker',
                email: 'worker@example.com',
                roles: [
                    {
                        id: 'worker-role',
                        name: 'Warehouse Worker',
                        permissions: [
                            { resource: 'INVENTORY', action: 'READ' },
                            { resource: 'INVENTORY', action: 'UPDATE' },
                        ],
                    },
                ],
                warehouses: [],
            } as any);
            const context = createMockExecutionContext('worker');

            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
            await expect(guard.canActivate(context)).rejects.toThrow(
                'Insufficient permissions. Required: INVENTORY:DELETE'
            );
        });
    });

    describe('Multiple Roles', () => {
        it('should allow access when any role has the required permission', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'ORDERS',
                action: 'APPROVE',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
                id: 'multi-role-user',
                email: 'multirole@example.com',
                roles: [
                    {
                        id: 'role-1',
                        name: 'Worker',
                        permissions: [{ resource: 'INVENTORY', action: 'READ' }],
                    },
                    {
                        id: 'role-2',
                        name: 'Supervisor',
                        permissions: [{ resource: 'ORDERS', action: 'APPROVE' }],
                    },
                ],
                warehouses: [],
            } as any);
            const context = createMockExecutionContext('multi-role-user');

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });

        it('should deny access when no role has the required permission', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'PURCHASE_ORDERS',
                action: 'APPROVE',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
                id: 'limited-user',
                email: 'limited@example.com',
                roles: [
                    {
                        id: 'role-1',
                        name: 'Reader',
                        permissions: [{ resource: 'INVENTORY', action: 'READ' }],
                    },
                    {
                        id: 'role-2',
                        name: 'Worker',
                        permissions: [{ resource: 'ORDERS', action: 'CREATE' }],
                    },
                ],
                warehouses: [],
            } as any);
            const context = createMockExecutionContext('limited-user');

            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
            await expect(guard.canActivate(context)).rejects.toThrow(
                'Insufficient permissions. Required: PURCHASE_ORDERS:APPROVE'
            );
        });
    });

    describe('User Attachment to Request', () => {
        it('should attach user to request when permission check passes', async () => {
            const mockUser = {
                id: 'test-user',
                email: 'test@example.com',
                roles: [
                    {
                        id: 'test-role',
                        name: 'Test Role',
                        permissions: [{ resource: 'INVENTORY', action: 'READ' }],
                    },
                ],
                warehouses: [],
            };

            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
                resource: 'INVENTORY',
                action: 'READ',
            });
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

            const context = createMockExecutionContext('test-user');
            const mockRequest = context.switchToHttp().getRequest();

            await guard.canActivate(context);

            expect(mockRequest.user).toEqual(mockUser);
        });
    });
});
