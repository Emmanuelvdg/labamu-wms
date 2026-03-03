import { IsString, IsNotEmpty, IsNumber, Min, NotEquals } from 'class-validator';

export class CreateAdjustmentDto {
    @IsString()
    @IsNotEmpty()
    productId!: string;

    @IsString()
    @IsNotEmpty()
    locationId!: string;

    @IsNumber()
    @NotEquals(0, { message: 'Adjustment quantity cannot be zero' })
    quantity!: number;

    @IsString()
    @IsNotEmpty()
    reason!: string;
}
