import { Module } from '@nestjs/common';
import { CategoriesController } from './controllers/categories.controller';
import { ItemsController } from './controllers/items.controller';
import { CategoriesService } from './services/categories.service';
import { ItemsService } from './services/items.service';

@Module({
  imports: [],
  controllers: [CategoriesController, ItemsController],
  providers: [CategoriesService, ItemsService],
  exports: [CategoriesService, ItemsService],
})
export class ItemsModule {}
