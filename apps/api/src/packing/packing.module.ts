import { Module } from '@nestjs/common';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [PackingController],
    providers: [PackingService, PrismaService],
    exports: [PackingService],
})
export class PackingModule { }
