import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { NotificationConfigService } from './notification-config.service';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { IsBoolean, IsArray, IsEmail, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class UpsertNotificationConfigDto {
    @IsBoolean()
    emailEnabled: boolean;

    @IsOptional()
    @IsArray()
    @IsEmail({}, { each: true })
    recipients?: string[] | null;
}

@Controller('companies/:companyId/notification-config')
@UseGuards(PermissionsGuard)
export class NotificationConfigController {
    constructor(private configService: NotificationConfigService) {}

    @Get()
    getAll(@Param('companyId') companyId: string) {
        return this.configService.getConfigs(companyId);
    }

    @Put(':type')
    upsert(
        @Param('companyId') companyId: string,
        @Param('type') type: string,
        @Body() dto: UpsertNotificationConfigDto,
    ) {
        return this.configService.upsertConfig(companyId, type, dto);
    }
}
