import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Article, Unavailability } from '../database/entities.js';
import { CreateUnavailabilityDto } from './unavailability.dto.js';

@Controller('admin/indisponibilites')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUnavailabilityController {
  constructor(
    @InjectRepository(Unavailability) private readonly entries: Repository<Unavailability>,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
  ) {}
  @Get() all() { return this.entries.find({ order: { dateDebut: 'DESC' } }); }
  @Post() async create(@Body() dto: CreateUnavailabilityDto) {
    if (!validDate(dto.dateDebut) || (dto.dateFin && (!validDate(dto.dateFin) || dto.dateFin < dto.dateDebut))) throw new BadRequestException('Période d’indisponibilité invalide');
    const article = await this.articles.findOneBy({ id: dto.articleId });
    if (!article) throw new NotFoundException('Article introuvable');
    if (dto.quantite > article.quantiteTotale) throw new BadRequestException('La quantité indisponible dépasse le stock total');
    return this.entries.save(this.entries.create(Object.assign({}, dto, { dateFin: dto.dateFin ?? null, motif: dto.motif ?? 'AUTRE', note: dto.note ?? null })));
  }
  @Delete(':id') async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.entries.delete(id);
    return { deleted: (result.affected ?? 0) > 0 };
  }
}

function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }
