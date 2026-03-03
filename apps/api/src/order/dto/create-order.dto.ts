import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsOptional, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
    @IsString()
    @IsNotEmpty()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;
}

export class CreateOrderDto {
    @IsString()
    @IsNotEmpty()
    customerId!: string;

    @IsEnum(['SALES', 'TRANSFER', 'STO'])
    @IsNotEmpty()
    type!: 'SALES' | 'TRANSFER' | 'STO'; // e.g., 'SALES', 'TRANSFER'

    @IsString()
    @IsNotEmpty()
    priority!: string;

    @IsOptional()
    @IsDateString()
    expectedDate?: Date;

    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsOptional()
    @IsString()
    destinationWarehouseId?: string;

    @IsOptional()
    @IsString()
    parentOrderId?: string;

    @IsOptional()
    @IsString()
    deliveryMethodId?: string;

    @IsOptional()
    @IsBoolean()
    shippingCostInCOGS?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items!: OrderItemDto[];
}
