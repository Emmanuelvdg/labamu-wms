
import { Controller, Post, Body, Get, Param, NotFoundException } from '@nestjs/common';
import { ReturnsService } from './returns.service';

@Controller('returns')
export class ReturnsController {
    constructor(private readonly returnsService: ReturnsService) { }

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
