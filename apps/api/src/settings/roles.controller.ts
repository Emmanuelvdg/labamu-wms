
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { RolesService } from './roles.service';

@Controller('settings/roles')
@UseGuards(PermissionsGuard)
export class RolesController {
    constructor(private rolesService: RolesService) { }

    @Post()
    @RequirePermission('SETTINGS', 'CREATE')
    async createRole(@Body() body: { name: string; description?: string; permissions?: { resource: string; action: string }[] }) {
        return this.rolesService.createRole(body);
    }

    @Get()
    @RequirePermission('SETTINGS', 'READ')
    async getRoles() {
        return this.rolesService.getRoles();
    }

    @Get(':id')
    @RequirePermission('SETTINGS', 'READ')
    async getRole(@Param('id') id: string) {
        return this.rolesService.getRole(id);
    }

    @Put(':id')
    @RequirePermission('SETTINGS', 'UPDATE')
    async updateRole(
        @Param('id') id: string,
        @Body() body: { name?: string; description?: string; permissions?: { resource: string; action: string }[] }
    ) {
        return this.rolesService.updateRole(id, body);
    }

    @Delete(':id')
    @RequirePermission('SETTINGS', 'DELETE')
    async deleteRole(@Param('id') id: string) {
        return this.rolesService.deleteRole(id);
    }
}
