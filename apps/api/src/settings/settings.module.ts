import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { AttributeController } from './attribute.controller';
import { AttributeService } from './attribute.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { CategoriesModule } from './categories/categories.module';
import { EmailModule } from '../common/email/email.module';

@Module({
    imports: [CategoriesModule, EmailModule],
    controllers: [RolesController, AttributeController, UsersController],
    providers: [RolesService, AttributeService, UsersService],
})
export class SettingsModule { }
