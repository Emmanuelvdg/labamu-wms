import { Controller, Post, Body, Param } from '@nestjs/common';
import { IntegrationService } from './integration.service';

@Controller('integration')
export class IntegrationController {
    constructor(private readonly integrationService: IntegrationService) { }

    @Post('sync/sales/:channel')
    syncSalesChannel(@Param('channel') channel: string) {
        return this.integrationService.syncSalesChannel(channel);
    }

    @Post('sync/logistics/:partner')
    syncLogistics(@Param('partner') partner: string) {
        return this.integrationService.syncLogistics(partner);
    }
}
