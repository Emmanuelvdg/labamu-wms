import { Module } from '@nestjs/common';
import { PrintingService } from './printing.service';
import { PrintingController } from './printing.controller';
import { PrismaService } from '../prisma.service';

@Module({
    imports: [],
    controllers: [PrintingController],
    providers: [PrintingService, PrismaService],
    exports: [PrintingService],
})
export class PrintingModule { }
