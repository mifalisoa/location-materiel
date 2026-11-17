import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mailer } from '@nestjs/mail';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Reservation, User } from '../database/entities.js';

@Injectable()
export class ReservationExpirationAlertService {
  private readonly logger = new Logger(ReservationExpirationAlertService.name);
  private readonly alertedReservationIds = new Set<number>();

  constructor(
    private readonly mailer: Mailer,
    @InjectRepository(Reservation) private readonly reservations: Repository<Reservation>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async notifyAdminsOfExpiringRequests() {
    const admins = await this.users.find({ where: { role: 'ADMIN', actif: true }, select: { email: true } });
    if (!admins.length) return;
    const now = new Date();
    const deadline = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const requests = await this.reservations.find({
      where: { statut: 'PROVISOIRE', expireLe: Between(now, deadline) },
    });
    for (const request of requests) {
      if (this.alertedReservationIds.has(request.id)) continue;
      try {
        await this.mailer.send({
          to: admins.map((admin) => admin.email),
          subject: `Demande ${request.reference} bientôt expirée`,
          text: `La demande provisoire ${request.reference} expirera le ${request.expireLe?.toLocaleString('fr-FR')}. Ouvrez le tableau admin pour la valider ou la refuser.`,
        });
        this.alertedReservationIds.add(request.id);
      } catch (cause) {
        this.logger.error(`Échec de l’alerte pour ${request.reference}`, cause instanceof Error ? cause.stack : undefined);
      }
    }
  }
}
