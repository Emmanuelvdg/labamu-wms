import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { LalamoveService } from './lalamove.service';
import { PrismaService } from '../prisma.service';

@Controller('lalamove')
export class LalamoveController {
    constructor(
        private lalamoveService: LalamoveService,
        private prisma: PrismaService
    ) { }

    @Get('config/:warehouseId')
    async getConfig(@Param('warehouseId') warehouseId: string) {
        return this.prisma.lalamoveConfig.findUnique({
            where: { warehouseId },
            select: {
                id: true,
                market: true,
                environment: true,
                defaultServiceType: true,
                active: true,
                webhookUrl: true,
                createdAt: true,
                // Don't expose API credentials
            },
        });
    }

    @Post('config')
    async createOrUpdateConfig(@Body() data: any) {
        const { warehouseId, apiKey, apiSecret, ...configData } = data;

        // Ensure market is always present (required field)
        const updateData = {
            market: configData.market || 'TH',
            environment: configData.environment || 'SANDBOX',
            defaultServiceType: configData.defaultServiceType || 'MOTORCYCLE',
            active: configData.active !== undefined ? configData.active : true,
            ...(configData.webhookUrl !== undefined && { webhookUrl: configData.webhookUrl }),
        };

        return this.prisma.lalamoveConfig.upsert({
            where: { warehouseId },
            create: {
                warehouseId,
                apiKey: 'PLATFORM_MANAGED',
                apiSecret: 'PLATFORM_MANAGED',
                ...updateData,
            },
            update: updateData,
        });
    }

    @Get('quotation/:orderId')
    async getQuotation(
        @Param('orderId') orderId: string,
        @Query('warehouseId') warehouseId: string,
    ) {
        try {
            return await this.lalamoveService.getQuotation(warehouseId, orderId);
        } catch (error: any) {
            console.error('[LALAMOVE QUOTATION ERROR]', error.message, error.response?.message);
            throw error;
        }
    }

    @Post('orders/:orderId')
    async placeOrder(
        @Param('orderId') orderId: string,
        @Body() body: { warehouseId: string; quotationId: string },
    ) {
        return this.lalamoveService.placeOrder(body.warehouseId, orderId, body.quotationId);
    }

    @Get('orders/:lalamoveOrderId')
    async getOrderStatus(@Param('lalamoveOrderId') lalamoveOrderId: string) {
        return this.lalamoveService.getOrderStatus(lalamoveOrderId);
    }

    @Delete('orders/:lalamoveOrderId')
    async cancelOrder(@Param('lalamoveOrderId') lalamoveOrderId: string) {
        return this.lalamoveService.cancelOrder(lalamoveOrderId);
    }

    @Post('webhook')
    async handleWebhook(@Body() payload: any) {
        await this.lalamoveService.handleWebhook(payload);
        return { status: 'ok' }; // Always return 200 for Lalamove
    }
}
