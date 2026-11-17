import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { Reservation, StatusHistory } from '../database/entities.js';

@Injectable()
export class ReservationExpirationService implements OnModuleInit {
  private readonly logger = new Logger(ReservationExpirationService.name);
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.expireProvisionalReservations();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expireProvisionalReservations() {
    await this.dataSource.transaction(async (manager) => {
      const expired = await manager.getRepository(Reservation).createQueryBuilder('r')
        .setLock('pessimistic_write').where('r.statut = :status AND r.expire_le IS NOT NULL AND r.expire_le <= NOW()', { status: 'PROVISOIRE' }).getMany();
      for (const reservation of expired) {
        reservation.statut = 'EXPIREE';
        await manager.save(reservation);
        await manager.save(StatusHistory, manager.create(StatusHistory, {
          reservationId: reservation.id, ancienStatut: 'PROVISOIRE', nouveauStatut: 'EXPIREE',
          utilisateurId: null, commentaire: 'Expiration automatique de la demande provisoire',
        }));
      }
      if (expired.length) this.logger.log(`${expired.length} demande(s) provisoire(s) expirée(s)`);
    });
  }
}
