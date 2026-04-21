import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [CompanyController],
    providers: [CompanyService, PrismaService],
    exports: [CompanyService],
})
export class CompanyModule {}
