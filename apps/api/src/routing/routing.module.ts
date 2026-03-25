import { Module } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [RoutingController],
    providers: [RoutingService, PrismaService],
    exports: [RoutingService],
})
export class RoutingModule {}
