import { IsEmail, IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @MaxLength(200)
    name: string;

    @IsEmail()
    email: string;

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
