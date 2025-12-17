import { Controller, Post, Body, Param, Put, Get, Delete } from '@nestjs/common';
import { FulfillmentService } from './fulfillment.service';
import { PrismaService } from '../prisma.service';

@Controller('fulfillment')
export class FulfillmentController {
    constructor(
        private fulfillmentService: FulfillmentService,
        private prisma: PrismaService
    ) { }

    // --- Rules ---

    @Get('rules')
    async getRules() {
        return this.prisma.fulfillmentRule.findMany({
            orderBy: { priority: 'asc' }
        });
    }

    @Post('rules')
    async createRule(@Body() data: any) {
        try {
            return await this.prisma.fulfillmentRule.create({ data });
        } catch (e: any) {
            const fs = require('fs');
            fs.writeFileSync('api_error.log', `Error creating rule: ${e.message}\n${JSON.stringify(e, null, 2)}`);
            throw e;
        }
    }

    @Put('rules/:id')
    async updateRule(@Param('id') id: string, @Body() data: any) {
        return this.prisma.fulfillmentRule.update({
            where: { id },
            data
        });
    }

    @Delete('rules/:id')
    async deleteRule(@Param('id') id: string) {
        return this.prisma.fulfillmentRule.delete({ where: { id } });
    }

    // --- Transfers ---

    @Post('transfers')
    async createTransfer(@Body() data: any) {
        return this.fulfillmentService.createTransferRequest(data);
    }

    @Put('transfers/:id/approve')
    async approveTransfer(@Param('id') id: string, @Body('approverId') approverId: string) {
        return this.fulfillmentService.approveTransfer(id, approverId);
    }

    @Get('transfers')
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
