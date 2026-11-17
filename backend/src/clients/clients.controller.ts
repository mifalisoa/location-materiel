import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateClientDto, UpdateClientNotesDto } from './client.dto.js';
import { ClientsService } from './clients.service.js';

@Controller('admin/clients')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}
  @Get() all() { return this.clients.all(); }
  @Post() create(@Body() dto: CreateClientDto) { return this.clients.create(dto); }
  @Patch(':id/notes') notes(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientNotesDto) { return this.clients.updateNotes(id, dto.notesAdmin ?? null); }
}
