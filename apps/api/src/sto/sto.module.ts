
import { Module } from '@nestjs/common';
import { StoController } from './sto.controller';
import { StoService } from './sto.service';
import {  } from '../prisma.service';

@Module({
    controllers: [StoController],
    providers: [StoService],
})
export class StoModule { }
