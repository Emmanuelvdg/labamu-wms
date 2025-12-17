
import { Module } from '@nestjs/common';
import { AttributeController } from './attribute.controller';
import { AttributeService } from './attribute.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [AttributeController],
    providers: [AttributeService, PrismaService],
})
export class SettingsModule { }
