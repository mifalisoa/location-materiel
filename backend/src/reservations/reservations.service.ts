import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { Article, Client, Reservation, ReservationEquipmentCheck, ReservationLine, ReservationPayment, ReservationPaymentType, ReservationStatus, StatusHistory, Unavailability, User } from '../database/entities.js';
import { CreateReservationDto, CreateReservationPaymentDto, DecideReservationDto, EquipmentCheckDto, ManualReservationDto, UpdateReservationStatusDto } from './reservation.dto.js';
import { maximumCommittedQuantity } from '../availability/stock-usage.js';
import { CommunicationsService } from '../communications/communications.service.js';
import { createInvoicePdf } from './invoice-pdf.js';

const dayCount = (from: string, to: string) => Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Reservation) private readonly reservations: Repository<Reservation>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    private readonly communications: CommunicationsService,
  ) {}

  async createOnline(userId: number, dto: CreateReservationDto) {
    return this.create(userId, dto);
  }

  async createManual(adminId: number, dto: ManualReservationDto) {
    return this.create(adminId, dto, dto.clientId, dto.stockForce ?? false, dto.statutInitial ?? 'PROVISOIRE');
  }

  private async create(userId: number, dto: CreateReservationDto, manualClientId?: number, stockForce = false, initialStatus: 'PROVISOIRE' | 'FERME' = 'PROVISOIRE') {
    const days = dayCount(dto.dateDebut, dto.dateFin);
    if (!Number.isFinite(days) || days < 1 || !isCalendarDate(dto.dateDebut) || !isCalendarDate(dto.dateFin)) throw new BadRequestException('Période de réservation invalide');
    if (dto.modeRemise === 'LIVRAISON' && !dto.adresseLivraison?.trim()) throw new BadRequestException('L’adresse de livraison est obligatoire');
    if (new Set(dto.articles.map((item) => item.articleId)).size !== dto.articles.length) throw new BadRequestException('Un article ne peut apparaître qu’une fois dans la demande');
    const requestedItems = [...dto.articles].sort((a, b) => a.articleId - b.articleId);

    const reservationId = await this.dataSource.transaction(async (manager) => {
      const client = await manager.findOne(Client, { where: manualClientId ? { id: manualClientId } : { utilisateurId: userId } });
      if (!client) throw new NotFoundException('Fiche client introuvable');
      const reservationRepo = manager.getRepository(Reservation);
      const lineRepo = manager.getRepository(ReservationLine);
      const articles: Article[] = [];
      for (const item of requestedItems) {
        const article = await manager.getRepository(Article).createQueryBuilder('a').setLock('pessimistic_write').where('a.id = :id AND a.actif = 1', { id: item.articleId }).getOne();
        if (!article) throw new NotFoundException(`Article ${item.articleId} introuvable ou inactif`);
        articles.push(article);
      }
      let total = 0;
      let cautionTotale = 0;
      const computed = [];
      for (let i = 0; i < requestedItems.length; i++) {
        const item = requestedItems[i];
        const article = articles[i];
        const committed = await maximumCommittedQuantity(manager, article.id, dto.dateDebut, dto.dateFin, article.margeJours);
        if (!stockForce && article.quantiteTotale - committed < item.quantite) {
          throw new ConflictException(`Stock insuffisant pour ${article.nom} sur cette période`);
        }
        const lineTotal = article.prixJour * days * item.quantite;
        total += lineTotal;
        cautionTotale += article.caution * item.quantite;
        computed.push({ articleId: article.id, quantite: item.quantite, prixJourUnitaire: article.prixJour, nbJours: days, totalLigne: lineTotal });
      }
      const expirationHours = Number(process.env.RESERVATION_HOLD_HOURS ?? (process.env.RESERVATION_HOLD_MINUTES ? Number(process.env.RESERVATION_HOLD_MINUTES) / 60 : 48));
      const expiry = manualClientId || initialStatus === 'FERME' ? null : new Date(Date.now() + Math.max(1, expirationHours) * 3_600_000);
      const reservation = await reservationRepo.save(reservationRepo.create({
        reference: `LOC-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        clientId: client.id, statut: initialStatus, source: manualClientId ? 'MANUELLE' : 'EN_LIGNE', dateDebut: dto.dateDebut, dateFin: dto.dateFin,
        expireLe: expiry, modeRemise: dto.modeRemise ?? 'RETRAIT', adresseLivraison: dto.adresseLivraison ?? null,
        total, cautionTotale, noteClient: dto.noteClient ?? null, stockForce,
        creeParId: manualClientId ? userId : null,
        traiteParId: initialStatus === 'FERME' ? userId : null,
        traiteLe: initialStatus === 'FERME' ? new Date() : null,
      }));
      await lineRepo.save(computed.map((line) => lineRepo.create({ ...line, reservationId: reservation.id })));
      const historyComment = manualClientId
        ? `Réservation manuelle créée${stockForce ? ' avec stock forcé' : ''}`
        : 'Demande envoyée en ligne';
      await manager.save(StatusHistory, manager.create(StatusHistory, { reservationId: reservation.id, ancienStatut: null, nouveauStatut: initialStatus, utilisateurId: userId, commentaire: historyComment }));
      return reservation.id;
    });
    const reservation = await this.reservations.findOne({ where: { id: reservationId }, relations: { lignes: { article: true } } });
    if (reservation) {
      if (!manualClientId) {
        const admins = await this.dataSource.getRepository(User).find({ where: { role: 'ADMIN', actif: true } });
        for (const admin of admins) await this.communications.notify(admin.id, reservation.id, 'RESERVATION', `Nouvelle demande de réservation ${reservation.reference}.`);
      } else {
        const client = await this.clients.findOne({ where: { id: reservation.clientId } });
        if (client?.utilisateurId) await this.communications.notify(client.utilisateurId, reservation.id, 'RESERVATION', `Votre réservation ${reservation.reference} a été créée.`);
      }
    }
    return reservation;
  }

  async mine(userId: number) {
    const client = await this.clients.findOne({ where: { utilisateurId: userId } });
    if (!client) throw new NotFoundException('Fiche client introuvable');
    return this.reservations.find({ where: { clientId: client.id }, relations: { lignes: { article: true } }, order: { id: 'DESC' } });
  }

  all() { return this.reservations.find({ relations: { lignes: { article: true } }, order: { id: 'DESC' } }); }

  async invoice(userId: number, role: 'CLIENT' | 'ADMIN', id: number) {
    const reservation = await this.reservations.findOne({ where: { id }, relations: { lignes: { article: true } } });
    if (!reservation) throw new NotFoundException('Réservation introuvable');
    if (!['FERME', 'EN_COURS', 'TERMINEE'].includes(reservation.statut)) throw new ConflictException('La facture est disponible après confirmation de la réservation');
    const client = await this.clients.findOne({ where: { id: reservation.clientId } });
    if (!client) throw new NotFoundException('Fiche client introuvable');
    if (role === 'CLIENT' && client.utilisateurId !== userId) throw new NotFoundException('Réservation introuvable');
    const issuer = process.env.INVOICE_ISSUER_NAME ?? 'Location de materiel evenementiel';
    return { filename: `facture-${reservation.reference}.pdf`, content: createInvoicePdf(reservation, client, issuer) };
  }

  async equipmentChecks(id: number) {
    if (!await this.reservations.exists({ where: { id } })) throw new NotFoundException('Réservation introuvable');
    return this.dataSource.getRepository(ReservationEquipmentCheck).find({ where: { reservationId: id }, order: { controleLe: 'ASC', id: 'ASC' } });
  }

  async checkout(userId: number, id: number, dto: EquipmentCheckDto) {
    const reservation = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Reservation);
      const current = await repo.findOne({ where: { id }, relations: { lignes: true }, lock: { mode: 'pessimistic_write' } });
      if (!current) throw new NotFoundException('Réservation introuvable');
      if (current.statut !== 'FERME') throw new ConflictException('La remise nécessite une réservation confirmée');
      const checks = validateEquipmentChecks(dto.lignes, current.lignes, 'SORTIE');
      if (checks.some((line) => line.etat === 'MANQUANT')) throw new BadRequestException('Le statut manquant ne s’utilise qu’au retour du matériel');
      await manager.save(ReservationEquipmentCheck, checks.map((line) => manager.create(ReservationEquipmentCheck, {
        reservationId: id, ligneReservationId: line.ligneReservationId, operation: 'SORTIE', quantite: line.quantite,
        etat: line.etat, note: line.note?.trim() || null, controleParId: userId,
      })));
      current.statut = 'EN_COURS'; current.traiteParId = userId; current.traiteLe = new Date();
      await repo.save(current);
      await manager.save(StatusHistory, manager.create(StatusHistory, { reservationId: id, ancienStatut: 'FERME', nouveauStatut: 'EN_COURS', utilisateurId: userId, commentaire: dto.commentaire?.trim() || 'Sortie du matériel contrôlée' }));
      return current;
    });
    await this.notifyReservationClient(reservation, 'Le matériel de votre réservation a été remis.');
    return { reservation, controles: await this.equipmentChecks(id) };
  }

  async checkin(userId: number, id: number, dto: EquipmentCheckDto) {
    const reservation = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Reservation);
      const current = await repo.findOne({ where: { id }, relations: { lignes: true }, lock: { mode: 'pessimistic_write' } });
      if (!current) throw new NotFoundException('Réservation introuvable');
      if (current.statut !== 'EN_COURS') throw new ConflictException('Le retour nécessite une réservation en cours');
      const priorChecks = await manager.find(ReservationEquipmentCheck, { where: { reservationId: id, operation: 'SORTIE' } });
      const issued = new Map<number, number>();
      for (const check of priorChecks) issued.set(check.ligneReservationId, (issued.get(check.ligneReservationId) ?? 0) + check.quantite);
      const checks = validateEquipmentChecks(dto.lignes, current.lignes, 'RETOUR', issued);
      await manager.save(ReservationEquipmentCheck, checks.map((line) => manager.create(ReservationEquipmentCheck, {
        reservationId: id, ligneReservationId: line.ligneReservationId, operation: 'RETOUR', quantite: line.quantite,
        etat: line.etat, note: line.note?.trim() || null, controleParId: userId,
      })));
      for (const check of checks.filter((line) => line.etat === 'ABIME' || line.etat === 'MANQUANT')) {
        const reservationLine = current.lignes.find((line) => line.id === check.ligneReservationId)!;
        await manager.save(Unavailability, manager.create(Unavailability, {
          articleId: reservationLine.articleId, quantite: check.quantite, dateDebut: new Date().toISOString().slice(0, 10), dateFin: null,
          motif: check.etat === 'ABIME' ? 'REPARATION' : 'HORS_SERVICE',
          note: `${check.etat === 'ABIME' ? 'Matériel à réparer' : 'Matériel manquant'} — réservation ${current.reference}${check.note ? ` : ${check.note}` : ''}`.slice(0, 255),
        }));
      }
      current.statut = 'TERMINEE'; current.traiteParId = userId; current.traiteLe = new Date();
      await repo.save(current);
      await manager.save(StatusHistory, manager.create(StatusHistory, { reservationId: id, ancienStatut: 'EN_COURS', nouveauStatut: 'TERMINEE', utilisateurId: userId, commentaire: dto.commentaire?.trim() || 'Retour du matériel contrôlé' }));
      return current;
    });
    await this.notifyReservationClient(reservation, 'Le retour de votre matériel a été enregistré.');
    return { reservation, controles: await this.equipmentChecks(id) };
  }

  async payments(userId: number, role: 'CLIENT' | 'ADMIN', id: number) {
    const reservation = await this.reservations.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Réservation introuvable');
    if (role === 'CLIENT') {
      const client = await this.clients.findOne({ where: { utilisateurId: userId } });
      if (!client || client.id !== reservation.clientId) throw new NotFoundException('Réservation introuvable');
    }
    const items = await this.dataSource.getRepository(ReservationPayment).find({ where: { reservationId: id }, order: { enregistreLe: 'DESC', id: 'DESC' } });
    const sum = (types: ReservationPaymentType[]) => items.filter((item) => types.includes(item.type)).reduce((total, item) => total + item.montant, 0);
    const locationPaid = sum(['PAIEMENT_LOCATION']) - sum(['REMBOURSEMENT_LOCATION']);
    const depositHeld = sum(['CAUTION_RECUE']) - sum(['CAUTION_RESTITUEE']);
    return { items, totalLocation: reservation.total, cautionAttendue: reservation.cautionTotale, locationPayee: locationPaid, soldeLocation: reservation.total - locationPaid, cautionDetenue: depositHeld, cautionARestituer: depositHeld };
  }

  async addPayment(userId: number, id: number, dto: CreateReservationPaymentDto) {
    const item = await this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!reservation) throw new NotFoundException('Réservation introuvable');
      const history = await manager.find(ReservationPayment, { where: { reservationId: id } });
      const totalOf = (...types: ReservationPaymentType[]) => history.filter((payment) => types.includes(payment.type)).reduce((total, payment) => total + payment.montant, 0);
      const remainingRent = reservation.total - totalOf('PAIEMENT_LOCATION') + totalOf('REMBOURSEMENT_LOCATION');
      const heldDeposit = totalOf('CAUTION_RECUE') - totalOf('CAUTION_RESTITUEE');
      const limits: Record<ReservationPaymentType, number> = {
        PAIEMENT_LOCATION: remainingRent,
        REMBOURSEMENT_LOCATION: totalOf('PAIEMENT_LOCATION') - totalOf('REMBOURSEMENT_LOCATION'),
        CAUTION_RECUE: reservation.cautionTotale - heldDeposit,
        CAUTION_RESTITUEE: heldDeposit,
      };
      if (dto.montant > limits[dto.type]) throw new BadRequestException('Le montant dépasse le solde restant pour cette opération');
      return manager.save(ReservationPayment, manager.create(ReservationPayment, {
        reservationId: id, type: dto.type, montant: dto.montant, mode: dto.mode,
        reference: dto.reference?.trim() || null, note: dto.note?.trim() || null, enregistreParId: userId,
      }));
    });
    const reservation = await this.reservations.findOneByOrFail({ id });
    await this.notifyReservationClient(reservation, `${paymentTypeLabel(dto.type)} enregistrée : ${dto.montant.toLocaleString('fr-FR')} MGA.`);
    return item;
  }

  private async notifyReservationClient(reservation: Reservation, message: string) {
    const client = await this.clients.findOne({ where: { id: reservation.clientId } });
    if (client?.utilisateurId) await this.communications.notify(client.utilisateurId, reservation.id, 'RESERVATION', message);
  }

  async decide(userId: number, id: number, dto: DecideReservationDto) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Reservation);
      const reservation = await repo.findOne({ where: { id }, relations: { lignes: true }, lock: { mode: 'pessimistic_write' } });
      if (!reservation) throw new NotFoundException('Réservation introuvable');
      if (reservation.statut !== 'PROVISOIRE') throw new ConflictException('Cette demande a déjà été traitée');
      if (reservation.expireLe && reservation.expireLe.getTime() <= Date.now()) throw new ConflictException('Cette demande a expiré');
      if (dto.statut === 'REFUSEE' && !dto.motif?.trim()) throw new BadRequestException('Le motif du refus est obligatoire');
      if (dto.statut === 'FERME' && !reservation.stockForce) {
        const orderedLines = [...reservation.lignes].sort((a, b) => a.articleId - b.articleId);
        for (const line of orderedLines) await manager.getRepository(Article).createQueryBuilder('a').setLock('pessimistic_write').where('a.id = :id', { id: line.articleId }).getOne();
        for (const line of orderedLines) {
          const article = await manager.findOneByOrFail(Article, { id: line.articleId });
          const committed = await maximumCommittedQuantity(manager, article.id, reservation.dateDebut, reservation.dateFin, article.margeJours, id);
          if (article.quantiteTotale - committed < line.quantite) throw new ConflictException(`Stock devenu insuffisant pour ${article.nom}`);
        }
      }
      const oldStatus = reservation.statut;
      reservation.statut = dto.statut;
      if (dto.statut === 'FERME') reservation.expireLe = null;
      reservation.traiteParId = userId;
      reservation.traiteLe = new Date();
      if (dto.statut === 'REFUSEE') reservation.motifRefus = dto.motif!.trim();
      await repo.save(reservation);
      await manager.save(StatusHistory, manager.create(StatusHistory, { reservationId: id, ancienStatut: oldStatus, nouveauStatut: dto.statut, utilisateurId: userId, commentaire: dto.motif ?? null }));
      const updated = await repo.findOne({ where: { id }, relations: { lignes: { article: true } } });
      if (updated) {
        const client = await manager.findOne(Client, { where: { id: updated.clientId } });
        if (client?.utilisateurId) await this.communications.notify(client.utilisateurId, id, 'STATUT', `Le statut de la réservation ${updated.reference} est maintenant ${updated.statut}.`);
      }
      return updated;
    });
  }

  async cancelMine(userId: number, id: number) {
    return this.dataSource.transaction(async (manager) => {
      const client = await manager.findOne(Client, { where: { utilisateurId: userId } });
      if (!client) throw new NotFoundException('Fiche client introuvable');
      const repo = manager.getRepository(Reservation);
      const reservation = await repo.findOne({ where: { id, clientId: client.id }, lock: { mode: 'pessimistic_write' } });
      if (!reservation) throw new NotFoundException('Réservation introuvable');
      if (!['PROVISOIRE', 'FERME'].includes(reservation.statut)) throw new ConflictException('Seules les réservations provisoires ou confirmées peuvent être annulées');
      const oldStatus = reservation.statut;
      reservation.statut = 'ANNULEE';
      await repo.save(reservation);
      await manager.save(StatusHistory, manager.create(StatusHistory, { reservationId: id, ancienStatut: oldStatus, nouveauStatut: 'ANNULEE', utilisateurId: userId, commentaire: 'Annulée par le client' }));
      return repo.findOne({ where: { id }, relations: { lignes: { article: true } } });
    });
  }

  async updateStatus(userId: number, id: number, dto: UpdateReservationStatusDto) {
    const updated = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Reservation);
      const reservation = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!reservation) throw new NotFoundException('Réservation introuvable');
      const allowed: Record<ReservationStatus, ReservationStatus[]> = {
        PROVISOIRE: ['ANNULEE'], FERME: ['ANNULEE'], EN_COURS: [],
        TERMINEE: [], REFUSEE: [], EXPIREE: [], ANNULEE: [],
      };
      if (!allowed[reservation.statut].includes(dto.statut)) {
        const detail = dto.statut === 'EN_COURS' || dto.statut === 'TERMINEE' ? ' Utilisez le contrôle de sortie ou de retour du matériel.' : '';
        throw new ConflictException(`Transition impossible : ${reservation.statut} vers ${dto.statut}.${detail}`);
      }
      const oldStatus = reservation.statut;
      reservation.statut = dto.statut;
      reservation.traiteParId = userId;
      reservation.traiteLe = new Date();
      await repo.save(reservation);
      await manager.save(StatusHistory, manager.create(StatusHistory, {
        reservationId: id, ancienStatut: oldStatus, nouveauStatut: dto.statut,
        utilisateurId: userId, commentaire: dto.commentaire ?? null,
      }));
      return repo.findOne({ where: { id }, relations: { lignes: { article: true } } });
    });
    if (updated) {
      const client = await this.clients.findOne({ where: { id: updated.clientId } });
      if (client?.utilisateurId) await this.communications.notify(client.utilisateurId, id, 'STATUT', `Le statut de la réservation ${updated.reference} est maintenant ${updated.statut}.`);
    }
    return updated;
  }
}

function isCalendarDate(date: string) { return new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date; }

function validateEquipmentChecks(
  entries: EquipmentCheckDto['lignes'],
  reservationLines: ReservationLine[],
  operation: 'SORTIE' | 'RETOUR',
  expectedQuantities = new Map(reservationLines.map((line) => [line.id, line.quantite])),
) {
  const validLineIds = new Set(reservationLines.map((line) => line.id));
  const totals = new Map<number, number>();
  for (const entry of entries) {
    if (!validLineIds.has(entry.ligneReservationId)) throw new BadRequestException('Une ligne ne correspond pas à cette réservation');
    if (operation === 'SORTIE' && entry.etat === 'MANQUANT') throw new BadRequestException('Un matériel ne peut pas être marqué manquant avant sa sortie');
    totals.set(entry.ligneReservationId, (totals.get(entry.ligneReservationId) ?? 0) + entry.quantite);
  }
  for (const line of reservationLines) {
    const expected = expectedQuantities.get(line.id);
    if (expected === undefined || expected < 1 || totals.get(line.id) !== expected) {
      throw new BadRequestException(`Le contrôle doit couvrir exactement ${expected ?? 0} unité(s) de la ligne ${line.id}`);
    }
  }
  return entries;
}

function paymentTypeLabel(type: ReservationPaymentType) {
  return ({
    PAIEMENT_LOCATION: 'Paiement de location',
    REMBOURSEMENT_LOCATION: 'Remboursement de location',
    CAUTION_RECUE: 'Réception de caution',
    CAUTION_RESTITUEE: 'Restitution de caution',
  } as const)[type];
}
