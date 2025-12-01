import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [SupplierController],
    providers: [SupplierService, PrismaService],
    exports: [SupplierService],
})
export class SupplierModule { }
