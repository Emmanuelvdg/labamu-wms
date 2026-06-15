import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import {  } from '../prisma.service';

@Module({
    controllers: [InvoiceController],
    providers: [InvoiceService],
})
export class InvoiceModule { }
