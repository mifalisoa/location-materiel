import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Article, EventCollection } from '../database/entities.js';
import { CreateEventDto, UpdateEventDto } from './event.dto.js';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventCollection) private readonly events: Repository<EventCollection>,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
  ) {}

  listPublic() {
    return this.events.createQueryBuilder('event')
      .leftJoinAndSelect('event.articles', 'article', 'article.actif = :articleActive', { articleActive: true })
      .leftJoinAndSelect('article.categorie', 'category')
      .where('event.actif = :eventActive', { eventActive: true })
      .orderBy('event.ordre', 'ASC').addOrderBy('event.nom', 'ASC').addOrderBy('article.nom', 'ASC')
      .getMany();
  }

  listAdmin() {
    return this.events.find({ relations: { articles: { categorie: true } }, order: { ordre: 'ASC', nom: 'ASC' } });
  }

  async create(dto: CreateEventDto) {
    const { articleIds, ...fields } = dto;
    const articles = await this.findArticles(articleIds ?? []);
    return this.events.save(this.events.create({ ...fields, sousTitre: fields.sousTitre ?? null, description: fields.description ?? null, imageUrl: fields.imageUrl ?? null, ordre: fields.ordre ?? 0, actif: true, articles }));
  }

  async update(id: number, dto: UpdateEventDto) {
    const event = await this.events.findOne({ where: { id }, relations: { articles: true } });
    if (!event) throw new NotFoundException('Événement introuvable');
    const { articleIds, ...fields } = dto;
    Object.assign(event, fields);
    if (articleIds !== undefined) event.articles = await this.findArticles(articleIds);
    return this.events.save(event);
  }

  async setActive(id: number, actif: boolean) {
    const event = await this.events.findOneBy({ id });
    if (!event) throw new NotFoundException('Événement introuvable');
    event.actif = actif;
    return this.events.save(event);
  }

  private async findArticles(articleIds: number[]) {
    if (!articleIds.length) return [];
    const articles = await this.articles.find({ where: { id: In(articleIds) }, relations: { categorie: true } });
    if (articles.length !== articleIds.length) throw new BadRequestException('Un ou plusieurs articles sélectionnés sont introuvables');
    return articles;
  }
}
