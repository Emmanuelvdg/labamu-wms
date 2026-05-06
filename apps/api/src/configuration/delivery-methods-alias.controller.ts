import { Controller } from '@nestjs/common';
import { DeliveryMethodsController } from './delivery-methods.controller';
import { PrismaService } from '../prisma.service';

@Controller('delivery-methods')
export class DeliveryMethodsAliasController extends DeliveryMethodsController {
    constructor(prisma: PrismaService) {
        super(prisma);
    }
}
