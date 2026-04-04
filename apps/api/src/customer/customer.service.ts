import { Injectable } from '@nestjs/common';
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

    async getCustomers(): Promise<any[]> {
        const customers = await this.prisma.customer.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { orders: true }
                },
            }
        });

        // Calculate lifetime value (LTV) per customer
        return Promise.all(customers.map(async (c) => {
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
