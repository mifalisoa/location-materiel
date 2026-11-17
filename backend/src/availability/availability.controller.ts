import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';

@Controller(['disponibilites', 'disponibilite'])
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  check(@Query('dateDebut') dateDebut: string, @Query('dateFin') dateFin: string, @Query('debut') debut: string, @Query('fin') fin: string) {
    const from = dateDebut ?? debut;
    const to = dateFin ?? fin;
    if (!from || !to || !isCalendarDate(from) || !isCalendarDate(to) || to < from) {
      throw new BadRequestException('Fournissez dateDebut et dateFin au format AAAA-MM-JJ, avec dateFin après dateDebut');
    }
    return this.availability.forPeriod(from, to);
  }
}

function isCalendarDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date; }
