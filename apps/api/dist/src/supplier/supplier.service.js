"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let SupplierService = class SupplierService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        return this.prisma.supplier.create({
            data,
        });
    }
    async findAll() {
        return this.prisma.supplier.findMany({
            include: {
                _count: {
                    select: { purchaseOrders: true },
                },
            },
        });
    }
    async findOne(id) {
        return this.prisma.supplier.findUnique({
            where: { id },
            include: {
                purchaseOrders: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });
    }
    async update(id, data) {
        return this.prisma.supplier.update({
            where: { id },
            data,
        });
    }
    async remove(id) {
        return this.prisma.supplier.delete({
            where: { id },
        });
    }
    async getSupplierStats(id) {
        const orders = await this.prisma.purchaseOrder.findMany({
            where: { supplierId: id },
            include: { items: true },
        });
        const totalOrders = orders.length;
        let totalSpend = 0;
        let totalItems = 0;
        for (const order of orders) {
            for (const item of order.items) {
                totalSpend += item.quantity * item.unitCost;
                totalItems += item.quantity;
            }
        }
        return {
            totalOrders,
            totalSpend,
            totalItems,
        };
    }
    async getSupplierOrders(id) {
        const orders = await this.prisma.purchaseOrder.findMany({
            where: { supplierId: id },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });
        return orders.map(order => (Object.assign(Object.assign({}, order), { totalAmount: order.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0), totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0) })));
    }
    async getProductPriceHistory(productId) {
        const items = await this.prisma.purchaseOrderItem.findMany({
            where: { productId },
            include: {
                purchaseOrder: {
                    include: { supplier: true },
                },
            },
            orderBy: { purchaseOrder: { createdAt: 'desc' } },
        });
        return items.map(item => ({
            date: item.purchaseOrder.createdAt,
            supplierName: item.purchaseOrder.supplier.name,
            unitCost: item.unitCost,
            quantity: item.quantity,
        }));
    }
};
exports.SupplierService = SupplierService;
exports.SupplierService = SupplierService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupplierService);
//# sourceMappingURL=supplier.service.js.map