import { Module } from '@nestjs/common';
import { LalamoveService } from './lalamove.service';
import { LalamoveController } from './lalamove.controller';
import {  } from '../prisma.service';

@Module({
    controllers: [LalamoveController],
    providers: [LalamoveService],
    exports: [LalamoveService],
})
export class LalamoveModule { }
