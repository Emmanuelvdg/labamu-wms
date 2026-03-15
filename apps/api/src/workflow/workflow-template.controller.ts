import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowValidationService } from './workflow-validation.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';

@Controller('workflows')
@UseGuards(PermissionsGuard)
export class WorkflowTemplateController {
    constructor(
        private readonly templateService: WorkflowTemplateService,
        private readonly validationService: WorkflowValidationService
    ) { }

    @Get()
    @RequirePermission('WORKFLOW', 'READ')
    async findAll() {
        return this.templateService.findAll();
    }

    @Get(':id')
    @RequirePermission('WORKFLOW', 'READ')
    async findOne(@Param('id') id: string) {
        return this.templateService.findOne(id);
    }

    @Post()
    @RequirePermission('WORKFLOW', 'CREATE')
    async create(@Body() data: any) {
        return this.templateService.create(data);
    }

    @Put(':id')
    @RequirePermission('WORKFLOW', 'UPDATE')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.templateService.update(id, data);
    }

    @Post(':id/clone')
    @RequirePermission('WORKFLOW', 'CREATE')
    async clone(@Param('id') id: string) {
        return this.templateService.clone(id);
    }

    @Post(':id/version')
    @RequirePermission('WORKFLOW', 'CREATE')
    async createVersion(@Param('id') id: string) {
        return this.templateService.createVersion(id);
    }

    @Post(':id/activate')
    @RequirePermission('WORKFLOW', 'UPDATE')
    async activate(@Param('id') id: string) {
        return this.templateService.activate(id);
    }

    @Post(':id/validate')
    @RequirePermission('WORKFLOW', 'READ')
    async validate(@Param('id') id: string) {
        return this.validationService.validateTemplate(id);
    }

    @Delete(':id')
    @RequirePermission('WORKFLOW', 'DELETE')
    async archive(@Param('id') id: string) {
        return this.templateService.archive(id);
    }
}
