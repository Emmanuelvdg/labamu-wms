
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { RequirePermission } from '../../common/auth/permissions.decorator';

@Controller('settings/users')
@UseGuards(PermissionsGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @RequirePermission('SETTINGS', 'READ')
    getUsers() {
        return this.usersService.getUsers();
    }

    @Get(':id')
    @RequirePermission('SETTINGS', 'READ')
    getUser(@Param('id') id: string) {
        return this.usersService.getUser(id);
    }

    @Post()
    @RequirePermission('SETTINGS', 'UPDATE')
    createUser(@Body() data: any) {
        return this.usersService.createUser(data);
    }

    @Put(':id')
    @RequirePermission('SETTINGS', 'UPDATE')
    updateUser(@Param('id') id: string, @Body() data: any) {
        return this.usersService.updateUser(id, data);
    }

    @Delete(':id')
    @RequirePermission('SETTINGS', 'UPDATE')
    deleteUser(@Param('id') id: string) {
        return this.usersService.deleteUser(id);
    }

    @Post(':id/reset-password')
    @RequirePermission('SETTINGS', 'UPDATE')
    resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
        return this.usersService.resetPassword(id, body.newPassword);
    }
}
