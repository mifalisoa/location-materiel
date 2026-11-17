import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Article } from '../database/entities.js';
import { maximumCommittedQuantity } from './stock-usage.js';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
  ) {}

  async forPeriod(from: string, to: string) {
    const articles = await this.articles.find({ where: { actif: true }, order: { nom: 'ASC' } });
    return Promise.all(articles.map(async (article) => {
      const committed = await maximumCommittedQuantity(this.dataSource.manager, article.id, from, to, article.margeJours);
      return { articleId: article.id, nom: article.nom, quantiteTotale: article.quantiteTotale,
        quantiteDisponible: Math.max(0, article.quantiteTotale - committed),
        prixJour: article.prixJour, caution: article.caution };
    }));
  }
}
