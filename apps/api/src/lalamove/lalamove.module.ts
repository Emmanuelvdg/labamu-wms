import { Module } from '@nestjs/common';
import { LalamoveService } from './lalamove.service';
import { LalamoveController } from './lalamove.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [LalamoveController],
    providers: [LalamoveService, PrismaService],
    exports: [LalamoveService],
})
export class LalamoveModule { }
