import {
    IsString, IsOptional, IsNumber, IsBoolean,
    MaxLength, Min, IsIn,
} from 'class-validator';

export class CreateProductDto {
    @IsString()
    @MaxLength(100)
    sku: string;

    @IsString()
    @MaxLength(500)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    category?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    categoryId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    classification?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    type?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    unitOfMeasure?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    averageCost?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    sellingPrice?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    unitCost?: number;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsOptional()
    @IsBoolean()
    isStockable?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    tracking?: string;

    @IsOptional()
    @IsString()
    @IsIn(['A', 'B', 'C'])
    velocity?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    velocityClass?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    safetyStock?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    reorderPoint?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    reorderQuantity?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxStock?: number;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    supplierId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    requiredAttributeId?: string;
}
