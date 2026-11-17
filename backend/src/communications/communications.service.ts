import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Client, Message, Notification, Reservation, User, UserRole } from '../database/entities.js';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Message) private readonly messagesRepo: Repository<Message>,
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(Client) private readonly clientsRepo: Repository<Client>,
  ) {}

  private async getReservation(userId: number, role: UserRole, reservationId: number) {
    const reservation = await this.dataSource.getRepository(Reservation).findOne({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Réservation introuvable');
    if (role === 'CLIENT') {
      const client = await this.clientsRepo.findOne({ where: { utilisateurId: userId } });
      if (!client || client.id !== reservation.clientId) throw new ForbiddenException('Cette réservation ne vous appartient pas');
    }
    return reservation;
  }

  async messages(userId: number, role: UserRole, reservationId: number) {
    await this.getReservation(userId, role, reservationId);
    return this.messagesRepo.find({ where: { reservationId }, order: { envoyeLe: 'ASC', id: 'ASC' } });
  }

  async send(userId: number, role: UserRole, reservationId: number, contenu: string) {
    const reservation = await this.getReservation(userId, role, reservationId);
    const message = await this.messagesRepo.save(this.messagesRepo.create({ reservationId, expediteurId: userId, contenu: contenu.trim() }));
    if (role === 'ADMIN') {
      const client = await this.clientsRepo.findOne({ where: { id: reservation.clientId } });
      if (client?.utilisateurId) await this.notify(client.utilisateurId, reservationId, 'MESSAGE', `Nouveau message de l'administrateur — ${reservation.reference}`);
    } else {
      const admins = await this.dataSource.getRepository(User).createQueryBuilder('u').select('u.id', 'id').where("u.role = 'ADMIN' AND u.actif = 1").getRawMany<{ id: number }>();
      for (const admin of admins) await this.notify(admin.id, reservationId, 'MESSAGE', `Nouveau message client — ${reservation.reference}`);
    }
    return message;
  }

  async notifications(userId: number) {
    const [items, unread] = await Promise.all([
      this.notificationsRepo.find({ where: { utilisateurId: userId }, order: { creeLe: 'DESC' }, take: 50 }),
      this.notificationsRepo.count({ where: { utilisateurId: userId, luLe: IsNull() } }),
    ]);
    return { items, unread };
  }

  async markRead(userId: number, id: number) {
    const notification = await this.notificationsRepo.findOne({ where: { id, utilisateurId: userId } });
    if (!notification) throw new NotFoundException('Notification introuvable');
    notification.luLe ??= new Date();
    return this.notificationsRepo.save(notification);
  }

  async markAllRead(userId: number) {
    await this.notificationsRepo.createQueryBuilder().update().set({ luLe: new Date() }).where('utilisateur_id = :userId AND lu_le IS NULL', { userId }).execute();
    return { success: true };
  }

  adminConversations() {
    return this.dataSource.getRepository(Reservation).find({ relations: { lignes: { article: true } }, order: { id: 'DESC' } });
  }

  async notify(userId: number, reservationId: number, type: string, message: string) {
    await this.notificationsRepo.save(this.notificationsRepo.create({ utilisateurId: userId, reservationId, type, message }));
  }
}
