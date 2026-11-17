import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, Category } from '../database/entities.js';
import { CreateArticleDto, CreateCategoryDto, UpdateArticleDto, UpdateCategoryDto } from './admin-catalog.dto.js';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Article) private readonly articlesRepo: Repository<Article>,
    @InjectRepository(Category) private readonly categoriesRepo: Repository<Category>,
  ) {}

  categories() { return this.categoriesRepo.find({ order: { ordre: 'ASC', nom: 'ASC' } }); }

  articles(categorieId?: number) {
    return this.articlesRepo.find({
      where: { actif: true, ...(categorieId ? { categorieId } : {}) },
      relations: { categorie: true },
      order: { nom: 'ASC' },
    });
  }

  article(id: number) { return this.articlesRepo.findOne({ where: { id, actif: true }, relations: { categorie: true } }); }

  allArticles() { return this.articlesRepo.find({ relations: { categorie: true }, order: { nom: 'ASC' } }); }

  async createArticle(dto: CreateArticleDto) {
    const article = this.articlesRepo.create(Object.assign({}, dto, { description: dto.description ?? null, imageUrl: dto.imageUrl ?? null,
      caution: dto.caution ?? 0, margeJours: dto.margeJours ?? 0, actif: true }));
    return this.articlesRepo.save(article);
  }

  async updateArticle(id: number, dto: UpdateArticleDto) {
    const article = await this.articlesRepo.findOneBy({ id });
    if (!article) throw new NotFoundException('Article introuvable');
    Object.assign(article, dto);
    return this.articlesRepo.save(article);
  }

  async setArticleActive(id: number, actif: boolean) {
    const article = await this.articlesRepo.findOneBy({ id });
    if (!article) throw new NotFoundException('Article introuvable');
    article.actif = actif;
    return this.articlesRepo.save(article);
  }

  createCategory(dto: CreateCategoryDto) { return this.categoriesRepo.save(this.categoriesRepo.create(Object.assign({}, dto, { ordre: dto.ordre ?? 0 }))); }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    const category = await this.categoriesRepo.findOneBy({ id });
    if (!category) throw new NotFoundException('Catégorie introuvable');
    Object.assign(category, dto);
    return this.categoriesRepo.save(category);
  }
}
