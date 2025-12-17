
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AttributeService {
    constructor(private prisma: PrismaService) { }

    async createDefinition(data: { name: string; type: string; options?: string }) {
        return this.prisma.locationAttributeDefinition.create({ data });
    }

    async getDefinitions() {
        return this.prisma.locationAttributeDefinition.findMany();
    }

    async updateDefinition(id: string, data: { name?: string; type?: string; options?: string }) {
        return this.prisma.locationAttributeDefinition.update({
            where: { id },
            data,
        });
    }

    async deleteDefinition(id: string) {
        return this.prisma.locationAttributeDefinition.delete({
            where: { id },
        });
    }
}
