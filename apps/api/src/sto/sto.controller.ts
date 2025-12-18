
import { Controller, Post, Body } from '@nestjs/common';
import { StoService } from './sto.service';
import { CreateStoDto } from './sto.dto';

@Controller('sto')
export class StoController {
    constructor(private readonly stoService: StoService) { }

    @Post('inbound')
    createInboundSto(@Body() data: CreateStoDto) {
        return this.stoService.createInboundSto(data);
    }
}
