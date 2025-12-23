import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PackagingService {
    constructor(private prisma: PrismaService) { }

    async createPackaging(data: {
        name: string;
        type: string;
        productId: string;
        quantity: number;
        storageRequirements?: string[];
        maxStacking?: number;
        dimensions?: { width: number; height: number; length: number; weight: number };
        // Allow flat dimensions as well
        width?: number;
        height?: number;
        length?: number;
        weight?: number;
    }) {
        return this.prisma.productPackaging.create({
            data: {
                name: data.name,
                unitType: data.type,
                productId: data.productId,
                quantity: data.quantity,
                storageRequirements: data.storageRequirements ? JSON.stringify(data.storageRequirements) : undefined,
                maxStacking: data.maxStacking || 1,
                width: data.dimensions?.width ?? data.width,
                height: data.dimensions?.height ?? data.height,
                length: data.dimensions?.length ?? data.length,
                weight: data.dimensions?.weight ?? data.weight,
            },
        });
    }

    async getPackaging(productId: string) {
        return this.prisma.productPackaging.findMany({
            where: { productId },
        });
    }

    async deletePackaging(id: string) {
        return this.prisma.productPackaging.delete({
            where: { id },
        });
    }
}
