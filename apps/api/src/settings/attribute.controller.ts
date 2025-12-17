
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { AttributeService } from './attribute.service';

@Controller('settings/attributes')
export class AttributeController {
    constructor(private readonly attributeService: AttributeService) { }

    @Post()
    async create(@Body() data: { name: string; type: string; options?: string }) {
        return this.attributeService.createDefinition(data);
    }

    @Get()
    async findAll() {
        return this.attributeService.getDefinitions();
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: { name?: string; type?: string; options?: string }) {
        return this.attributeService.updateDefinition(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.attributeService.deleteDefinition(id);
    }
}
