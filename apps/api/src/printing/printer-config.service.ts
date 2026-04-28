import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { getCurrentCompanyId } from '../common/tenant/tenant-storage';

export interface CreatePrinterConfigDto {
    name: string;
    outputType?: 'PDF' | 'ZPL';
    host?: string;
    port?: number;
    isDefault?: boolean;
    labelWidth?: number;
    labelHeight?: number;
}

@Injectable()
export class PrinterConfigService {
    constructor(private readonly prisma: PrismaService) {}

    private companyId(): string {
        const id = getCurrentCompanyId();
        if (!id) throw new NotFoundException('No tenant context');
        return id;
    }

    async list() {
        return this.prisma.printerConfig.findMany({
            where: { companyId: this.companyId() },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });
    }

    async create(dto: CreatePrinterConfigDto) {
        const companyId = this.companyId();
        if (dto.isDefault) await this.clearDefault(companyId);
        return this.prisma.printerConfig.create({ data: { ...dto, companyId } });
    }

    async update(id: string, dto: Partial<CreatePrinterConfigDto>) {
        const companyId = this.companyId();
        await this.findOwned(id, companyId);
        if (dto.isDefault) await this.clearDefault(companyId);
        return this.prisma.printerConfig.update({ where: { id }, data: dto });
    }

    async setDefault(id: string) {
        const companyId = this.companyId();
        await this.findOwned(id, companyId);
        await this.clearDefault(companyId);
        return this.prisma.printerConfig.update({ where: { id }, data: { isDefault: true } });
    }

    async remove(id: string) {
        const companyId = this.companyId();
        await this.findOwned(id, companyId);
        return this.prisma.printerConfig.delete({ where: { id } });
    }

    async getDefault() {
        return this.prisma.printerConfig.findFirst({
            where: { companyId: this.companyId(), isDefault: true },
        });
    }

    private async findOwned(id: string, companyId: string) {
        const record = await this.prisma.printerConfig.findUnique({ where: { id } });
        if (!record || record.companyId !== companyId) throw new NotFoundException('Printer config not found');
        return record;
    }

    private async clearDefault(companyId: string) {
        await this.prisma.printerConfig.updateMany({
            where: { companyId, isDefault: true },
            data: { isDefault: false },
        });
    }
}
