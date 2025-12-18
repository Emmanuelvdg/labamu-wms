
import { Module } from '@nestjs/common';
import { StoController } from './sto.controller';
import { StoService } from './sto.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [StoController],
    providers: [StoService, PrismaService],
})
export class StoModule { }
