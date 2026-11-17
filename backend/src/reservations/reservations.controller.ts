import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { CreateReservationDto, CreateReservationPaymentDto, DecideReservationDto, EquipmentCheckDto, ManualReservationDto, UpdateReservationStatusDto } from './reservation.dto.js';
import { ReservationsService } from './reservations.service.js';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post() create(@Req() req: AuthenticatedRequest, @Body() dto: CreateReservationDto) {
    return this.reservations.createOnline(req.user.id, dto);
  }

  @Get(['mes', 'moi']) mine(@Req() req: AuthenticatedRequest) { return this.reservations.mine(req.user.id); }

  @Patch(':id/annuler') cancel(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.reservations.cancelMine(req.user.id, id);
  }

  @Get(':id/facture')
  async invoice(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const invoice = await this.reservations.invoice(req.user.id, req.user.role, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${invoice.filename}"`);
    response.send(invoice.content);
  }

  @Get()
  @UseGuards(AdminGuard)
  all() { return this.reservations.all(); }

  @Post('manuelles')
  @UseGuards(AdminGuard)
  createManual(@Req() req: AuthenticatedRequest, @Body() dto: ManualReservationDto) {
    return this.reservations.createManual(req.user.id, dto);
  }

  @Patch(':id/decision')
  @UseGuards(AdminGuard)
  decide(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: DecideReservationDto) {
    return this.reservations.decide(req.user.id, id, dto);
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  updateStatus(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReservationStatusDto) {
    return this.reservations.updateStatus(req.user.id, id, dto);
  }

  @Get(':id/controles-materiel')
  @UseGuards(AdminGuard)
  equipmentChecks(@Param('id', ParseIntPipe) id: number) { return this.reservations.equipmentChecks(id); }

  @Post(':id/sortie-materiel')
  @UseGuards(AdminGuard)
  checkout(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: EquipmentCheckDto) {
    return this.reservations.checkout(req.user.id, id, dto);
  }

  @Post(':id/retour-materiel')
  @UseGuards(AdminGuard)
  checkin(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: EquipmentCheckDto) {
    return this.reservations.checkin(req.user.id, id, dto);
  }

  @Get(':id/paiements')
  payments(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.reservations.payments(req.user.id, req.user.role, id);
  }

  @Post(':id/paiements')
  @UseGuards(AdminGuard)
  addPayment(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: CreateReservationPaymentDto) {
    return this.reservations.addPayment(req.user.id, id, dto);
  }
}
