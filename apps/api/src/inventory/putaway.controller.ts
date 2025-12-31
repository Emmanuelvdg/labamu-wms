import { Controller, Get, Post, Patch, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PutawayService } from './putaway.service';

@Controller('inventory/putaway')
export class PutawayController {
    constructor(private putawayService: PutawayService) { }

    /**
     * Create a new putaway session
     */
    @Post('sessions')
    async createSession(@Body() data: { warehouseId: string; workerId?: string }) {
        if (!data.warehouseId) {
            throw new HttpException('warehouseId is required', HttpStatus.BAD_REQUEST);
        }
        return this.putawayService.createSession(data.warehouseId, data.workerId);
    }

    /**
     * Get active putaway session for a warehouse
     */
    @Get('sessions/:warehouseId/active')
    async getActiveSession(@Param('warehouseId') warehouseId: string) {
        const session = await this.putawayService.getActiveSession(warehouseId);
        if (!session) {
            throw new HttpException('No active session found', HttpStatus.NOT_FOUND);
        }
        return session;
    }

    /**
     * Complete a putaway session
     */
    @Patch('sessions/:sessionId/complete')
    async completeSession(@Param('sessionId') sessionId: string) {
        return this.putawayService.completeSession(sessionId);
    }

    /**
     * Update a putaway task
     */
    @Patch('tasks/:taskId')
    async updateTask(
        @Param('taskId') taskId: string,
        @Body() data: {
            putawayQuantity?: number;
            status?: string;
            exceptionType?: string;
            exceptionReason?: string;
            actualQuantity?: number;
            alternativeLocationId?: string;
            requiresSupervisorReview?: boolean;
        }
    ) {
        return this.putawayService.updateTask(taskId, data);
    }

    /**
     * Get alternative locations for a task
     */
    @Get('tasks/:taskId/alternatives')
    async getAlternatives(
        @Param('taskId') taskId: string,
        @Query('warehouseId') warehouseId: string
    ) {
        // Get task details
        const task = await this.putawayService['prisma'].putawayTask.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
        }

        return this.putawayService.findAlternativeLocations(
            task.productId,
            task.quantity,
            warehouseId,
            task.destinationLocationId
        );
    }

    /**
     * Handle damaged inventory exception
     */
    @Post('tasks/:taskId/exception/damaged')
    async handleDamaged(
        @Param('taskId') taskId: string,
        @Body() data: { damagedQty: number; goodQty: number; quarantineLocationId?: string }
    ) {
        return this.putawayService.handleDamagedInventory(
            taskId,
            data.damagedQty,
            data.goodQty,
            data.quarantineLocationId
        );
    }

    /**
     * Handle quantity mismatch exception
     */
    @Post('tasks/:taskId/exception/mismatch')
    async handleMismatch(
        @Param('taskId') taskId: string,
        @Body() data: { expectedQty: number; actualQty: number; reason: string }
    ) {
        return this.putawayService.handleQuantityMismatch(
            taskId,
            data.expectedQty,
            data.actualQty,
            data.reason
        );
    }

    /**
     * Get blocked tasks requiring supervisor review
     */
    @Get('tasks/blocked')
    async getBlockedTasks(@Query('warehouseId') warehouseId: string) {
        if (!warehouseId) {
            throw new HttpException('warehouseId is required', HttpStatus.BAD_REQUEST);
        }
        return this.putawayService.getBlockedTasks(warehouseId);
    }

    /**
     * Check location capacity
     */
    @Get('locations/:locationId/capacity')
    async checkCapacity(
        @Param('locationId') locationId: string,
        @Query('productId') productId: string,
        @Query('quantity') quantity: string
    ) {
        if (!productId || !quantity) {
            throw new HttpException('productId and quantity are required', HttpStatus.BAD_REQUEST);
        }
        return this.putawayService.checkLocationCapacity(
            locationId,
            productId,
            parseInt(quantity)
        );
    }
}
