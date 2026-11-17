import { EntityManager } from 'typeorm';
import { Reservation, ReservationLine, Unavailability } from '../database/entities.js';

const ACTIVE_STATUSES = ['PROVISOIRE', 'FERME', 'EN_COURS'];

type Occupancy = { start: string; end: string | null; quantity: number };

export async function maximumCommittedQuantity(manager: EntityManager, articleId: number, from: string, to: string, marginDays = 0, excludeReservationId?: number) {
  const occupiedEnd = `DATE_ADD(r.date_fin, INTERVAL ${Math.max(0, marginDays)} DAY)`;
  const reservationsQuery = manager.getRepository(Reservation).createQueryBuilder('r')
    .innerJoin(ReservationLine, 'line', 'line.reservation_id = r.id AND line.article_id = :articleId', { articleId })
    .where('r.statut IN (:...statuses)', { statuses: ACTIVE_STATUSES })
    .andWhere('(r.statut <> :provisional OR r.expire_le IS NULL OR r.expire_le > NOW())', { provisional: 'PROVISOIRE' })
    .andWhere(`r.date_debut <= :to AND ${occupiedEnd} >= :from`, { from, to })
    .select("DATE_FORMAT(r.date_debut, '%Y-%m-%d')", 'start')
    .addSelect(`DATE_FORMAT(${occupiedEnd}, '%Y-%m-%d')`, 'end').addSelect('line.quantite', 'quantity');
  if (excludeReservationId) reservationsQuery.andWhere('r.id <> :excludeId', { excludeId: excludeReservationId });
  const reservations = await reservationsQuery.getRawMany<{ start: string; end: string; quantity: number }>();
  const unavailabilities = await manager.getRepository(Unavailability).createQueryBuilder('u')
    .where('u.article_id = :articleId', { articleId })
    .andWhere('u.date_debut <= :to AND (u.date_fin IS NULL OR u.date_fin >= :from)', { from, to })
    .select("DATE_FORMAT(u.date_debut, '%Y-%m-%d')", 'start')
    .addSelect("DATE_FORMAT(u.date_fin, '%Y-%m-%d')", 'end').addSelect('u.quantite', 'quantity').getRawMany<{ start: string; end: string | null; quantity: number }>();
  return peakCommittedQuantity(from, to, reservations, unavailabilities);
}

export function peakCommittedQuantity(from: string, to: string, reservations: Occupancy[], unavailabilities: Occupancy[]) {
  let max = 0;
  for (let day = from; day <= to; day = shiftDate(day, 1)) {
    const booked = reservations.reduce((sum, row) => row.start <= day && row.end !== null && row.end >= day ? sum + Number(row.quantity) : sum, 0);
    const outOfService = unavailabilities.reduce((sum, row) => row.start <= day && (row.end === null || row.end >= day) ? sum + Number(row.quantity) : sum, 0);
    max = Math.max(max, booked + outOfService);
  }
  return max;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
