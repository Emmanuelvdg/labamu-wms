import { IsEmail, IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    password?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roleIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    warehouseIds?: string[];
}
