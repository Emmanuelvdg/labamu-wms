import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class POItemDto {
    @IsString()
    @IsNotEmpty()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;

    @IsNumber()
    @Min(0)
    unitCost!: number;

    @IsString()
    @IsOptional()
    packagingId?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class CreatePurchaseOrderDto {
    @IsString()
    @IsNotEmpty()
    supplierId!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => POItemDto)
    items!: POItemDto[];
}
