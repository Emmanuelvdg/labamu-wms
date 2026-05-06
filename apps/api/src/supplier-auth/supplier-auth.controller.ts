import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { SupplierAuthService } from './supplier-auth.service';
import { SupplierAuthGuard } from './supplier-auth.guard';

@Controller('supplier-auth')
export class SupplierAuthController {
    constructor(private service: SupplierAuthService) { }

    @Post('invite')
    invite(@Body() body: { email: string; supplierId: string; expiresInDays?: number }) {
        return this.service.invite(body.email, body.supplierId, body.expiresInDays ?? 7);
    }

    @Post('register')
    register(@Body() body: { token: string; password: string }) {
        return this.service.register(body.token, body.password);
    }

    @Post('login')
    login(@Body() body: { email: string; password: string }) {
        return this.service.login(body.email, body.password);
    }

    @Get('me')
    @UseGuards(SupplierAuthGuard)
    me(@Request() req: any) {
        return this.service.getMe(req.user.supplierUserId);
    }
}
