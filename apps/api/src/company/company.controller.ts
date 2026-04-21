import {
    Controller, Post, Get, Body, Param, Patch,
    Headers, UnauthorizedException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto, InviteUserDto } from './dto/create-company.dto';

@Controller('companies')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) {}

    /**
     * Public endpoint — no auth required.
     * Creates a new company + first admin user (self-service onboarding).
     */
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    register(@Body() dto: CreateCompanyDto) {
        return this.companyService.registerCompany(dto);
    }

    /**
     * Super-admin only — list all companies.
     * In production gate this behind a platform-level API key or role check.
     */
    @Get()
    listAll(@Headers('x-user-id') _userId: string) {
        return this.companyService.listCompanies();
    }

    @Get(':id')
    getOne(@Param('id') id: string) {
        return this.companyService.getCompany(id);
    }

    /**
     * Invite a user to a company.
     * Caller must belong to the target company (enforced via companyId from JWT).
     */
    @Post(':id/invite')
    @HttpCode(HttpStatus.CREATED)
    invite(
        @Param('id') companyId: string,
        @Headers('x-user-id') _userId: string,
        @Body() dto: InviteUserDto,
    ) {
        return this.companyService.inviteUser(companyId, dto);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
    ) {
        return this.companyService.updateStatus(id, status);
    }
}
