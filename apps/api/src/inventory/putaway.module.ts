import { Module } from '@nestjs/common';
import { PutawayController } from './putaway.controller';
import { PutawayService } from './putaway.service';
import {  } from '../prisma.service';

import { UtilisationService } from './utilisation.service';

@Module({
    controllers: [PutawayController],
    providers: [PutawayService, UtilisationService],
    exports: [PutawayService],
})
export class PutawayModule { }
