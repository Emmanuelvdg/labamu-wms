
import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { ReturnsService } from './returns.service';

@Controller('returns')
@UseGuards(PermissionsGuard)
export class ReturnsController {
    constructor(private readonly returnsService: ReturnsService) { }

    @Get()
    @RequirePermission('RETURNS', 'READ')
    async listReturns(@Query('orderId') orderId?: string) {
        return this.returnsService.listReturns(orderId);
    }

    @Get(':id')
    async getReturn(@Param('id') id: string) {
        return this.returnsService.getReturn(id);
    }

    @Post()
    async createReturnRequest(@Body() createReturnDto: {
        originalOrderId: string;
        items: { productId: string; quantity: number; returnReason: string }[];
    }) {
        return this.returnsService.createReturnRequest(createReturnDto);
    }

    @Post(':id/receive')
    async receiveReturn(
        @Param('id') id: string,
        @Body() receiveDto: {
            items: { productId: string; quantity: number; condition: string }[];
        }
    ) {
        return this.returnsService.receiveReturn(id, receiveDto);
    }

    @Get('order/:orderId')
    async getReturnsByOrder(@Param('orderId') orderId: string) {
        return this.returnsService.getReturnsByOrder(orderId);
    }
}
