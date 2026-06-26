import { Controller, Post, Body, Param, Put, Get, Delete, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { FulfillmentService } from './fulfillment.service';
import { PrismaService } from '../prisma.service';

@Controller('fulfillment')
@UseGuards(PermissionsGuard)
export class FulfillmentController {
    constructor(
        private fulfillmentService: FulfillmentService,
        private prisma: PrismaService
    ) { }

    // --- Rules ---

    @Get('rules')
    @RequirePermission('FULFILLMENT', 'READ')
    async getRules() {
        return this.prisma.fulfillmentRule.findMany({
            orderBy: { priority: 'asc' }
        });
    }

    @Post('rules')
    @RequirePermission('FULFILLMENT', 'CREATE')
    async createRule(@Body() data: any) {
        try {
            return await this.prisma.fulfillmentRule.create({ data });
        } catch (e: any) {
            throw e;
        }
    }

    @Put('rules/:id')
    @RequirePermission('FULFILLMENT', 'UPDATE')
    async updateRule(@Param('id') id: string, @Body() data: any) {
        return this.prisma.fulfillmentRule.update({
            where: { id },
            data
        });
    }

    @Delete('rules/:id')
    @RequirePermission('FULFILLMENT', 'DELETE')
    async deleteRule(@Param('id') id: string) {
        return this.prisma.fulfillmentRule.delete({ where: { id } });
    }

    // --- Transfers ---

    @Post('transfers')
    @RequirePermission('FULFILLMENT', 'CREATE')
    async createTransfer(@Body() data: any) {
        return this.fulfillmentService.createTransferRequest(data);
    }

    @Put('transfers/:id/approve')
    @RequirePermission('FULFILLMENT', 'APPROVE')
    async approveTransfer(@Param('id') id: string, @Body('approverId') approverId: string) {
        return this.fulfillmentService.approveTransfer(id, approverId);
    }

    @Get('transfers')
    @RequirePermission('FULFILLMENT', 'READ')
    async getTransfers() {
        return this.prisma.transferOrder.findMany({
            include: {
                sourceWarehouse: true,
                destinationWarehouse: true,
                items: { include: { product: true } },
                initiator: true,
                approver: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
