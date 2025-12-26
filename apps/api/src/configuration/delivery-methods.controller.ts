import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('configuration/delivery-methods')
export class DeliveryMethodsController {
    constructor(private prisma: PrismaService) { }

    @Get()
    async getDeliveryMethods() {
        return this.prisma.deliveryMethod.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                provider: true,
                fixedPrice: true,
                carrier: true,
            }
        });
    }
}
