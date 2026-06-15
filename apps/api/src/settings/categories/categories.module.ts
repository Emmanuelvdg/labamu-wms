
import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import {  } from '../../prisma.service';

@Module({
    controllers: [CategoriesController],
    providers: [CategoriesService], // Ensure  is available
    exports: [CategoriesService],
})
export class CategoriesModule { }
