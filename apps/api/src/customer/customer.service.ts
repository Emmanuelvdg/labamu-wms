import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Customer } from '@labamu/database';

@Injectable()
export class CustomerService {
    constructor(private prisma: PrismaService) { }

    async createCustomer(data: { name: string; address?: string; latitude?: number; longitude?: number }): Promise<Customer> {
        return this.prisma.customer.create({
            data: {
                name: data.name,
                address: data.address,
                latitude: data.latitude,
                longitude: data.longitude,
            },
        });
    }

    async bulkCreateCustomers(items: { name: string; address?: string; latitude?: number; longitude?: number }[]): Promise<{ created: any[]; errors: { index: number; item: any; error: string }[] }> {
        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestException('items must be a non-empty array');
        }
        if (items.length > 500) {
            throw new BadRequestException('Bulk create is limited to 500 items per request');
        }
        const created: any[] = [];
        const errors: { index: number; item: any; error: string }[] = [];
        const BATCH = 50;
        for (let i = 0; i < items.length; i += BATCH) {
            const batch = items.slice(i, i + BATCH);
            const results = await Promise.allSettled(batch.map((item) => this.createCustomer(item)));
            results.forEach((r, j) => {
                if (r.status === 'fulfilled') {
                    created.push(r.value);
                } else {
                    errors.push({ index: i + j, item: batch[j], error: r.reason?.message ?? String(r.reason) });
                }
            });
        }
        return { created, errors };
    }

    async getCustomers(take = 50, skip = 0): Promise<any> {
        const [customers, total] = await Promise.all([
            this.prisma.customer.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { orders: true }
                    },
                },
                take,
                skip,
            }),
            this.prisma.customer.count(),
        ]);

        // Calculate lifetime value (LTV) per customer in this page
        const data = await Promise.all(customers.map(async (c) => {
            const agg = await this.prisma.order.aggregate({
                where: { customerId: c.id, status: { notIn: ['CANCELLED'] } },
                _sum: { totalAmount: true }
            });
            return {
                ...c,
                totalOrders: c._count.orders,
                lifetimeValue: agg._sum.totalAmount || 0,
            };
        }));

        return { data, total, limit: take, offset: skip };
    }

    async getCustomer(id: string): Promise<any | null> {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    include: { items: { include: { product: true } } }
                }
            }
        });

        if (customer) {
            const ltv = customer.orders
                .filter(o => o.status !== 'CANCELLED')
                .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
            return { ...customer, totalOrders: customer.orders.length, lifetimeValue: ltv };
        }
        return null;
    }

    async updateCustomer(id: string, data: any): Promise<Customer> {
        return this.prisma.customer.update({
            where: { id },
            data: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                city: data.city,
                country: data.country,
                state: data.state,
                postalCode: data.postalCode,
                latitude: data.latitude,
                longitude: data.longitude,
            },
        });
    }

    async deleteCustomer(id: string): Promise<Customer> {
        return this.prisma.customer.delete({
            where: { id },
        });
    }
}
