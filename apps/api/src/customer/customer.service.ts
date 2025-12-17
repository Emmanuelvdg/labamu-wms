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

    async getCustomers(): Promise<Customer[]> {
        return this.prisma.customer.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async getCustomer(id: string): Promise<Customer | null> {
        return this.prisma.customer.findUnique({
            where: { id },
        });
    }
}
