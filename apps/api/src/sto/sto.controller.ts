import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { StoService } from './sto.service';
import { CreateStoDto } from './sto.dto';
import { PermissionsGuard } from '../common/auth/permissions.guard';

@Controller('sto')
@UseGuards(PermissionsGuard)
export class StoController {
    constructor(private readonly stoService: StoService) { }

    @Post('inbound')
    createInboundSto(@Body() data: CreateStoDto) {
        return this.stoService.createInboundSto(data);
    }
}
