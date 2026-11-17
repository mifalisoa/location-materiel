import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateEventDto, UpdateEventActiveDto, UpdateEventDto } from './event.dto.js';
import { EventsService } from './events.service.js';

@Controller('admin/evenements')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminEventsController {
  constructor(private readonly events: EventsService) {}
  @Get() list() { return this.events.listAdmin(); }
  @Post() create(@Body() dto: CreateEventDto) { return this.events.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) { return this.events.update(id, dto); }
  @Patch(':id/actif') setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventActiveDto) { return this.events.setActive(id, dto.actif); }
}
