import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get(['catalogue/categories', 'categories']) categories() { return this.catalog.categories(); }
  @Get(['catalogue/articles', 'articles']) articles(@Query('categorie') category?: string) {
    return this.catalog.articles(category ? Number(category) : undefined);
  }
  @Get(['catalogue/articles/:id', 'articles/:id']) async article(@Param('id', ParseIntPipe) id: number) {
    const article = await this.catalog.article(id);
    if (!article) throw new NotFoundException('Article introuvable');
    return article;
  }
}
