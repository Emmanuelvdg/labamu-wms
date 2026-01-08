
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@labamu/database';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        // @ts-ignore
        return this.prisma.category.create({
            data,
        });
    }

    async findAll() {
        // @ts-ignore
        return this.prisma.category.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        // @ts-ignore
        return this.prisma.category.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: any) {
        // @ts-ignore
        return this.prisma.category.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        // @ts-ignore
        return this.prisma.category.delete({
            where: { id },
        });
    }
}
