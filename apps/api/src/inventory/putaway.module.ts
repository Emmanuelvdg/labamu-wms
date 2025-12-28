import { Module } from '@nestjs/common';
import { PutawayController } from './putaway.controller';
import { PutawayService } from './putaway.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [PutawayController],
    providers: [PutawayService, PrismaService],
    exports: [PutawayService],
})
export class PutawayModule { }
