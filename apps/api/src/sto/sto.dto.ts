import { IsString, IsOptional, IsArray, ValidateNested, IsNotEmpty, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class StoItemDto {
    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsInt()
    quantity: number;
}

export class CreateStoDto {
    @IsString()
    @IsNotEmpty()
    externalId: string;

    @IsEnum(['MRP', 'RETAIL'])
    sourceSystem: 'MRP' | 'RETAIL';

    @IsString()
    @IsOptional()
    sourceWarehouseId?: string;

    @IsString()
    @IsNotEmpty()
    destinationWarehouseId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StoItemDto)
    items: StoItemDto[];

    @IsString()
    @IsOptional()
    expectedDate?: string;
}
