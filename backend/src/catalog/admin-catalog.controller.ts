import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateArticleDto, UpdateArticleDto } from './admin-catalog.dto.js';
import { CatalogService } from './catalog.service.js';

@Controller('admin/catalogue/articles')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get() all() { return this.catalog.allArticles(); }
  @Post() create(@Body() dto: CreateArticleDto) { return this.catalog.createArticle(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleDto) { return this.catalog.updateArticle(id, dto); }
  @Patch(':id/desactiver') deactivate(@Param('id', ParseIntPipe) id: number) { return this.catalog.setArticleActive(id, false); }
  @Patch(':id/activer') activate(@Param('id', ParseIntPipe) id: number) { return this.catalog.setArticleActive(id, true); }
}
