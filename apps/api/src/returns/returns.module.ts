
import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [ReturnsController],
    providers: [ReturnsService, PrismaService],
})
export class ReturnsModule { }
