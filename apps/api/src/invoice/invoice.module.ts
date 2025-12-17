import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [InvoiceController],
    providers: [InvoiceService, PrismaService],
})
export class InvoiceModule { }
