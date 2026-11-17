import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, Category } from '../database/entities.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { AdminCategoriesController } from './admin-categories.controller.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Article, Category])],
  controllers: [CatalogController, AdminCatalogController, AdminCategoriesController],
  providers: [CatalogService, AdminGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
