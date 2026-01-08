import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { AttributeController } from './attribute.controller';
import { AttributeService } from './attribute.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { PrismaService } from '../prisma.service';
import { CategoriesModule } from './categories/categories.module';

@Module({
    imports: [CategoriesModule],
    controllers: [RolesController, AttributeController, UsersController],
    providers: [RolesService, AttributeService, UsersService, PrismaService],
})
export class SettingsModule { }
