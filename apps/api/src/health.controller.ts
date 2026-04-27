import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async check() {
        let dbOk = false;
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            dbOk = true;
        } catch {
            // DB unreachable — still return 200 so the process stays running;
            // caller can inspect the body to determine readiness
        }

        return {
            status: dbOk ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            db: dbOk ? 'ok' : 'unreachable',
        };
    }
}
