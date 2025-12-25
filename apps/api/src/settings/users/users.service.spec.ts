import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
    let service: UsersService;
    let prisma: PrismaService;

    const mockPrismaService = {
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getUsers', () => {
        it('should return all users with roles and warehouses', async () => {
            const mockUsers = [
                {
                    id: '1',
                    email: 'test@example.com',
                    name: 'Test User',
                    roles: [{ id: 'r1', name: 'Admin' }],
                    warehouses: [{ id: 'w1', name: 'Main Warehouse' }],
                },
            ];

            mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

            const result = await service.getUsers();

            expect(result).toEqual(mockUsers);
            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
                include: { roles: true, warehouses: true },
                orderBy: { name: 'asc' },
            });
        });
    });

    describe('getUser', () => {
        it('should return a user by ID', async () => {
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                name: 'Test User',
                roles: [],
                warehouses: [],
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.getUser('1');

            expect(result).toEqual(mockUser);
            expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
                where: { id: '1' },
                include: { roles: true, warehouses: true },
            });
        });

        it('should throw NotFoundException if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.getUser('invalid-id')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('createUser', () => {
        it('should create user with minimal data', async () => {
            const createData = {
                name: 'New User',
                email: 'new@example.com',
            };

            const mockCreatedUser = {
                id: '2',
                ...createData,
                password: 'password',
                roles: [],
                warehouses: [],
            };

            mockPrismaService.user.findUnique.mockResolvedValue(null); // Email doesn't exist
            mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

            const result = await service.createUser(createData);

            expect(result).toEqual(mockCreatedUser);
            expect(mockPrismaService.user.create).toHaveBeenCalledWith({
                data: {
                    name: createData.name,
                    email: createData.email,
                    password: 'password',
                    roles: { connect: [] },
                    warehouses: { connect: [] },
                },
                include: { roles: true, warehouses: true },
            });
        });

        it('should create user with role and warehouse assignments', async () => {
            const createData = {
                name: 'New User',
                email: 'new@example.com',
                password: 'custom-password',
                roleIds: ['role-1', 'role-2'],
                warehouseIds: ['wh-1'],
            };

            const mockCreatedUser = {
                id: '3',
                name: createData.name,
                email: createData.email,
                password: 'custom-password',
                roles: [
                    { id: 'role-1', name: 'Admin' },
                    { id: 'role-2', name: 'Manager' },
                ],
                warehouses: [{ id: 'wh-1', name: 'Main Warehouse' }],
            };

            mockPrismaService.user.findUnique.mockResolvedValue(null);
            mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

            const result = await service.createUser(createData);

            expect(result).toEqual(mockCreatedUser);
            expect(mockPrismaService.user.create).toHaveBeenCalledWith({
                data: {
                    name: createData.name,
                    email: createData.email,
                    password: createData.password,
                    roles: {
                        connect: [{ id: 'role-1' }, { id: 'role-2' }],
                    },
                    warehouses: {
                        connect: [{ id: 'wh-1' }],
                    },
                },
                include: { roles: true, warehouses: true },
            });
        });

        it('should throw BadRequestException if email already exists', async () => {
            const createData = {
                name: 'Duplicate User',
                email: 'existing@example.com',
            };

            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'existing-id',
                email: createData.email,
            });

            await expect(service.createUser(createData)).rejects.toThrow(
                BadRequestException,
            );
            expect(mockPrismaService.user.create).not.toHaveBeenCalled();
        });
    });

    describe('updateUser', () => {
        it('should update user fields', async () => {
            const userId = 'user-1';
            const updateData = {
                name: 'Updated Name',
                email: 'updated@example.com',
            };

            const existingUser = {
                id: userId,
                name: 'Old Name',
                email: 'old@example.com',
                password: 'hashed',
            };

            const updatedUser = {
                ...existingUser,
                ...updateData,
                roles: [],
                warehouses: [],
            };

            mockPrismaService.user.findUnique
                .mockResolvedValueOnce(existingUser) // First call for existence check
                .mockResolvedValueOnce(null); // Second call for email uniqueness check

            mockPrismaService.user.update.mockResolvedValue(updatedUser);

            const result = await service.updateUser(userId, updateData);

            expect(result).toEqual(updatedUser);
            expect(mockPrismaService.user.update).toHaveBeenCalledWith({
                where: { id: userId },
                data: {
                    name: updateData.name,
                    email: updateData.email,
                    password: undefined,
                    roles: { set: [] },
                    warehouses: { set: [] },
                },
                include: { roles: true, warehouses: true },
            });
        });

        it('should update user roles', async () => {
            const userId = 'user-1';
            const updateData = {
                roleIds: ['new-role-1', 'new-role-2'],
            };

            const existingUser = { id: userId, email: 'test@example.com' };
            const updatedUser = {
                ...existingUser,
                roles: [
                    { id: 'new-role-1', name: 'Role 1' },
                    { id: 'new-role-2', name: 'Role 2' },
                ],
                warehouses: [],
            };

            mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
            mockPrismaService.user.update.mockResolvedValue(updatedUser);

            const result = await service.updateUser(userId, updateData);

            expect(result.roles).toHaveLength(2);
            expect(mockPrismaService.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        roles: {
                            set: [{ id: 'new-role-1' }, { id: 'new-role-2' }],
                        },
                    }),
                }),
            );
        });

        it('should throw NotFoundException if user does not exist', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(
                service.updateUser('invalid-id', { name: 'Test' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if new email already exists', async () => {
            const userId = 'user-1';
            const updateData = {
                email: 'existing@example.com',
            };

            const existingUser = { id: userId, email: 'old@example.com' };
            const conflictUser = { id: 'other-user', email: 'existing@example.com' };

            mockPrismaService.user.findUnique
                .mockResolvedValueOnce(existingUser) // Existence check
                .mockResolvedValueOnce(conflictUser); // Email uniqueness check

            await expect(service.updateUser(userId, updateData)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('deleteUser', () => {
        it('should delete a user', async () => {
            const userId = 'user-to-delete';
            const deletedUser = { id: userId, email: 'deleted@example.com' };

            mockPrismaService.user.delete.mockResolvedValue(deletedUser);

            const result = await service.deleteUser(userId);

            expect(result).toEqual(deletedUser);
            expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
                where: { id: userId },
            });
        });
    });

    describe('resetPassword', () => {
        it('should reset user password with hashed value', async () => {
            const userId = 'user-1';
            const newPassword = 'NewPassword123!';
            const updatedUser = {
                id: userId,
                email: 'test@example.com',
                password: 'hashed-new-password',
            };

            // Mock bcrypt.hash
            const bcrypt = require('bcrypt');
            jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-new-password');

            mockPrismaService.user.update.mockResolvedValue(updatedUser);

            const result = await service.resetPassword(userId, newPassword);

            expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
            expect(mockPrismaService.user.update).toHaveBeenCalledWith({
                where: { id: userId },
                data: { password: 'hashed-new-password' },
            });
            expect(result.password).toBe('hashed-new-password');
        });
    });
});
