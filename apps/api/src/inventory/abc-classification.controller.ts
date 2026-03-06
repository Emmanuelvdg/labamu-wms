import { Controller, Post, Param, Query } from '@nestjs/common';
import { AbcClassificationService } from './abc-classification.service';

@Controller('inventory/abc-classification')
export class AbcClassificationController {
    constructor(private readonly abcService: AbcClassificationService) { }

    @Post(':warehouseId/run')
    async runClassification(
        @Param('warehouseId') warehouseId: string,
        @Query('periodDays') periodDays?: string
    ) {
        return this.abcService.runClassification(
            warehouseId,
            periodDays ? parseInt(periodDays) : 90
        );
    }
}
