import { Module } from '@nestjs/common';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';
import {  } from '../prisma.service';

@Module({
    controllers: [PackingController],
    providers: [PackingService],
    exports: [PackingService],
})
export class PackingModule { }
