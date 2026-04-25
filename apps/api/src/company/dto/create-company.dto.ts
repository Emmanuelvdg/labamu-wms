import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCompanyDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    /** URL-safe slug: lowercase letters, numbers, hyphens only */
    @IsString()
    @Matches(/^[a-z0-9-]+$/, { message: 'slug must only contain lowercase letters, numbers and hyphens' })
    slug: string;

    /** Plan tier: STARTER | GROWTH | ENTERPRISE */
    @IsString()
    @IsOptional()
    plan?: string;

    // ── First admin user ──────────────────────────────────────────────────
    @IsString()
    @IsNotEmpty()
    adminName: string;

    @IsEmail()
    adminEmail: string;

    @IsString()
    @MinLength(8)
    adminPassword: string;
}

export class InviteUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsString()
    @IsOptional()
    roleId?: string;
}

export class UpdateCompanyDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[a-z0-9-]+$/, { message: 'slug must only contain lowercase letters, numbers and hyphens' })
    slug?: string;

    @IsString()
    @IsOptional()
    plan?: string;
}
