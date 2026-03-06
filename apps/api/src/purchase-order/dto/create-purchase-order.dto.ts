import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsOptional, IsDate } from 'class-validator';
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

    @IsString()
    @IsOptional()
    poNumber?: string;

    @Type(() => Date)
    @IsDate()
    @IsOptional()
    orderDate?: Date;

    @Type(() => Date)
    @IsDate()
    @IsOptional()
    expectedDate?: Date;

    @IsString()
    @IsOptional()
    buyerName?: string;

    @IsString()
    @IsOptional()
    buyerAddress?: string;

    @IsString()
    @IsOptional()
    buyerContact?: string;

    @IsString()
    @IsOptional()
    shipToAddress?: string;

    @IsString()
    @IsOptional()
    billToAddress?: string;

    @IsString()
    @IsOptional()
    paymentTerms?: string;

    @IsString()
    @IsOptional()
    deliveryTerms?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    taxAmount?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    shippingCost?: number;

    @IsString()
    @IsOptional()
    destinationLocationId?: string;
}
