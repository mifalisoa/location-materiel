import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AvailabilityModule } from '../availability/availability.module.js';
import { Article, Client, Reservation, ReservationEquipmentCheck, ReservationLine, ReservationPayment, StatusHistory, Unavailability, User } from '../database/entities.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { ReservationExpirationService } from './reservation-expiration.service.js';
import { ReservationExpirationAlertService } from './reservation-expiration-alert.service.js';
import { CommunicationsModule } from '../communications/communications.module.js';

@Module({
  imports: [AuthModule, AvailabilityModule, CommunicationsModule, TypeOrmModule.forFeature([Article, Client, Reservation, ReservationEquipmentCheck, ReservationLine, ReservationPayment, StatusHistory, Unavailability, User])],
  controllers: [ReservationsController], providers: [ReservationsService, AdminGuard, ReservationExpirationService, ReservationExpirationAlertService],
})
export class ReservationsModule {}
