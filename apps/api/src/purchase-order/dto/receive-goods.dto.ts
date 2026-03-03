import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ReceiveItemDto {
    @IsString()
    @IsNotEmpty()
    poItemId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;

    @IsString()
    @IsOptional()
    batchNumber?: string;

    @IsString()
    @IsOptional()
    expiryDate?: string;
}

export class ReceiveGoodsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReceiveItemDto)
    @IsOptional()
    items?: ReceiveItemDto[];

    @IsString()
    @IsOptional()
    locationId?: string;

    @IsString()
    @IsOptional()
    inspectorId?: string;
}
