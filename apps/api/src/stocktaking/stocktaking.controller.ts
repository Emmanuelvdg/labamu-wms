
import { Controller, Post, Body, Get, Param, Patch, Query } from '@nestjs/common';
import { StocktakingService } from './stocktaking.service';

@Controller('stocktaking')
export class StocktakingController {
    constructor(private readonly service: StocktakingService) { }

    @Post('sessions')
    createSession(@Body() body: { warehouseId: string; type?: string; name?: string; description?: string }) {
        return this.service.createSession({
            warehouseId: body.warehouseId,
            type: body.type ?? body.name ?? 'FULL',
            description: body.description,
        });
    }

    @Get('sessions')
    getSessions(@Query('warehouseId') warehouseId?: string) {
        return this.service.getSessions(warehouseId);
    }

    @Get('sessions/:id')
    getSession(@Param('id') id: string) {
        return this.service.getSession(id);
    }

    @Post('sessions/:id/generate-tasks')
    generateTasks(@Param('id') id: string) {
        return this.service.generateTasks(id);
    }

    @Post('tasks/:taskId/count')
    submitCount(
        @Param('taskId') taskId: string,
        @Body() body: { countedQuantity: number; countedBy: string }
    ) {
        return this.service.submitCount(taskId, body.countedQuantity, body.countedBy);
    }

    @Post('sessions/:id/reconcile')
    reconcileSession(@Param('id') id: string) {
        return this.service.reconcileSession(id);
    }
}
