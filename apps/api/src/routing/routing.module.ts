import { Module } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import {  } from '../prisma.service';

@Module({
    controllers: [RoutingController],
    providers: [RoutingService],
    exports: [RoutingService],
})
export class RoutingModule {}
