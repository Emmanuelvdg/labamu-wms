import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import {  } from '../prisma.service';

@Module({
    controllers: [SupplierController],
    providers: [SupplierService],
    exports: [SupplierService],
})
export class SupplierModule { }
