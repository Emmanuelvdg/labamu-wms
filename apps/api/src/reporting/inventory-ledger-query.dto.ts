import { IsOptional, IsEnum, IsISO8601, IsString } from 'class-validator';

export class InventoryLedgerQueryDto {
    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsOptional()
    @IsString()
    locationId?: string;

    @IsOptional()
    @IsEnum(['PUTAWAY', 'PICKING', 'SHIPPED', 'LOST', 'DAMAGED', 'ADJUSTMENT'])
    status?: string;

    @IsOptional()
    @IsString()
    productId?: string;

    @IsOptional()
    @IsEnum(['7d', '30d', '90d', 'custom'])
    period?: string;

    @IsOptional()
    @IsISO8601()
    startDate?: string;

    @IsOptional()
    @IsISO8601()
    endDate?: string;
    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    limit?: string;

    @IsOptional()
    @IsString()
    format?: string;
}
