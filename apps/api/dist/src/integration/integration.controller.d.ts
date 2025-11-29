import { IntegrationService } from './integration.service';
export declare class IntegrationController {
    private readonly integrationService;
    constructor(integrationService: IntegrationService);
    syncSalesChannel(channel: string): Promise<any>;
    syncLogistics(partner: string): Promise<any>;
}
//# sourceMappingURL=integration.controller.d.ts.map