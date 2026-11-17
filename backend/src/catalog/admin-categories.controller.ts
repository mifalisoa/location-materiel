import { Body, Controller, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateCategoryDto, UpdateCategoryDto } from './admin-catalog.dto.js';
import { CatalogService } from './catalog.service.js';

@Controller('admin/catalogue/categories')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCategoriesController {
  constructor(private readonly catalog: CatalogService) {}
  @Post() create(@Body() dto: CreateCategoryDto) { return this.catalog.createCategory(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) { return this.catalog.updateCategory(id, dto); }
}
