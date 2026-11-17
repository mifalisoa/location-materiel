import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type UserRole = 'CLIENT' | 'ADMIN';
export type ReservationStatus =
  | 'PROVISOIRE'
  | 'FERME'
  | 'EN_COURS'
  | 'TERMINEE'
  | 'REFUSEE'
  | 'EXPIREE'
  | 'ANNULEE';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ length: 120 }) nom: string;
  @Column({ length: 140, unique: true }) slug: string;
  @Column({ type: 'int', default: 0 }) ordre: number;
  @OneToMany(() => Article, (article) => article.categorie) articles: Article[];
}

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ name: 'categorie_id', type: 'int', unsigned: true }) categorieId: number;
  @ManyToOne(() => Category, (category) => category.articles)
  @JoinColumn({ name: 'categorie_id' }) categorie: Category;
  @Column({ length: 160 }) nom: string;
  @Column({ length: 180, unique: true }) slug: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'image_url', type: 'varchar', length: 255, nullable: true }) imageUrl: string | null;
  @Column({ name: 'prix_jour', type: 'int', unsigned: true }) prixJour: number;
  @Column({ type: 'int', unsigned: true, default: 0 }) caution: number;
  @Column({ name: 'quantite_totale', type: 'int', unsigned: true, default: 0 }) quantiteTotale: number;
  @Column({ name: 'marge_jours', type: 'int', unsigned: true, default: 0 }) margeJours: number;
  @Column({ type: 'boolean', default: true }) actif: boolean;
  @ManyToMany(() => EventCollection, (event) => event.articles) evenements: EventCollection[];
}

@Entity('evenements')
export class EventCollection {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ length: 120 }) nom: string;
  @Column({ length: 140, unique: true }) slug: string;
  @Column({ name: 'sous_titre', type: 'varchar', length: 180, nullable: true }) sousTitre: string | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'image_url', type: 'varchar', length: 255, nullable: true }) imageUrl: string | null;
  @Column({ type: 'int', default: 0 }) ordre: number;
  @Column({ type: 'boolean', default: true }) actif: boolean;
  @ManyToMany(() => Article, (article) => article.evenements)
  @JoinTable({
    name: 'evenement_articles',
    joinColumn: { name: 'evenement_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'article_id', referencedColumnName: 'id' },
  }) articles: Article[];
}

@Entity('utilisateurs')
export class User {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ length: 190, unique: true }) email: string;
  @Column({ name: 'mot_de_passe_hash', length: 255, select: false }) motDePasseHash: string;
  @Column({ type: 'enum', enum: ['CLIENT', 'ADMIN'], default: 'CLIENT' }) role: UserRole;
  @Column({ type: 'boolean', default: true }) actif: boolean;
}

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ name: 'utilisateur_id', type: 'int', unsigned: true, nullable: true, unique: true }) utilisateurId: number | null;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'utilisateur_id' }) utilisateur: User | null;
  @Column({ length: 120 }) nom: string;
  @Column({ length: 120 }) prenom: string;
  @Column({ type: 'varchar', length: 160, nullable: true }) societe: string | null;
  @Column({ length: 30 }) telephone: string;
  @Column({ type: 'varchar', length: 190, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) adresse: string | null;
  @Column({ name: 'notes_admin', type: 'text', nullable: true }) notesAdmin: string | null;
}

@Entity('indisponibilites')
export class Unavailability {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ name: 'article_id', type: 'int', unsigned: true }) articleId: number;
  @Column({ type: 'int', unsigned: true, default: 1 }) quantite: number;
  @Column({ name: 'date_debut', type: 'date' }) dateDebut: string;
  @Column({ name: 'date_fin', type: 'date', nullable: true }) dateFin: string | null;
  @Column({ type: 'enum', enum: ['REPARATION', 'HORS_SERVICE', 'AUTRE'], default: 'AUTRE' }) motif: 'REPARATION' | 'HORS_SERVICE' | 'AUTRE';
  @Column({ type: 'varchar', length: 255, nullable: true }) note: string | null;
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ length: 20, unique: true }) reference: string;
  @Column({ name: 'client_id', type: 'int', unsigned: true }) clientId: number;
  @Column({ type: 'enum', enum: ['PROVISOIRE', 'FERME', 'EN_COURS', 'TERMINEE', 'REFUSEE', 'EXPIREE', 'ANNULEE'], default: 'PROVISOIRE' }) statut: ReservationStatus;
  @Column({ type: 'enum', enum: ['EN_LIGNE', 'MANUELLE'], default: 'EN_LIGNE' }) source: 'EN_LIGNE' | 'MANUELLE';
  @Column({ name: 'date_debut', type: 'date' }) dateDebut: string;
  @Column({ name: 'date_fin', type: 'date' }) dateFin: string;
  @Column({ name: 'expire_le', type: 'datetime', nullable: true }) expireLe: Date | null;
  @Column({ name: 'mode_remise', type: 'enum', enum: ['RETRAIT', 'LIVRAISON'], default: 'RETRAIT' }) modeRemise: 'RETRAIT' | 'LIVRAISON';
  @Column({ name: 'adresse_livraison', type: 'varchar', length: 255, nullable: true }) adresseLivraison: string | null;
  @Column({ type: 'int', unsigned: true, default: 0 }) total: number;
  @Column({ name: 'caution_totale', type: 'int', unsigned: true, default: 0 }) cautionTotale: number;
  @Column({ name: 'note_client', type: 'text', nullable: true }) noteClient: string | null;
  @Column({ name: 'note_admin', type: 'text', nullable: true }) noteAdmin: string | null;
  @Column({ name: 'motif_refus', type: 'varchar', length: 255, nullable: true }) motifRefus: string | null;
  @Column({ name: 'stock_force', type: 'boolean', default: false }) stockForce: boolean;
  @Column({ name: 'cree_par_id', type: 'int', unsigned: true, nullable: true }) creeParId: number | null;
  @Column({ name: 'traite_par_id', type: 'int', unsigned: true, nullable: true }) traiteParId: number | null;
  @Column({ name: 'traite_le', type: 'datetime', nullable: true }) traiteLe: Date | null;
  @OneToMany(() => ReservationLine, (line) => line.reservation) lignes: ReservationLine[];
}

@Entity('lignes_reservation')
export class ReservationLine {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ name: 'reservation_id', type: 'int', unsigned: true }) reservationId: number;
  @ManyToOne(() => Reservation, (reservation) => reservation.lignes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservation_id' }) reservation: Reservation;
  @Column({ name: 'article_id', type: 'int', unsigned: true }) articleId: number;
  @ManyToOne(() => Article)
  @JoinColumn({ name: 'article_id' }) article: Article;
  @Column({ type: 'int', unsigned: true }) quantite: number;
  @Column({ name: 'prix_jour_unitaire', type: 'int', unsigned: true }) prixJourUnitaire: number;
  @Column({ name: 'nb_jours', type: 'int', unsigned: true }) nbJours: number;
  @Column({ name: 'total_ligne', type: 'int', unsigned: true }) totalLigne: number;
}

export type EquipmentCheckKind = 'SORTIE' | 'RETOUR';
export type EquipmentCondition = 'BON' | 'ABIME' | 'MANQUANT';

@Entity('suivi_reservation_materiel')
export class ReservationEquipmentCheck {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ name: 'reservation_id', type: 'int', unsigned: true }) reservationId: number;
  @Column({ name: 'ligne_reservation_id', type: 'int', unsigned: true }) ligneReservationId: number;
  @Column({ type: 'enum', enum: ['SORTIE', 'RETOUR'] }) operation: EquipmentCheckKind;
  @Column({ type: 'int', unsigned: true }) quantite: number;
  @Column({ type: 'enum', enum: ['BON', 'ABIME', 'MANQUANT'] }) etat: EquipmentCondition;
  @Column({ type: 'varchar', length: 500, nullable: true }) note: string | null;
  @Column({ name: 'controle_par_id', type: 'int', unsigned: true }) controleParId: number;
  @Column({ name: 'controle_le', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) controleLe: Date;
}

export type ReservationPaymentType = 'PAIEMENT_LOCATION' | 'REMBOURSEMENT_LOCATION' | 'CAUTION_RECUE' | 'CAUTION_RESTITUEE';

@Entity('paiements_reservation')
export class ReservationPayment {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ name: 'reservation_id', type: 'int', unsigned: true }) reservationId: number;
  @Column({ type: 'enum', enum: ['PAIEMENT_LOCATION', 'REMBOURSEMENT_LOCATION', 'CAUTION_RECUE', 'CAUTION_RESTITUEE'] }) type: ReservationPaymentType;
  @Column({ type: 'int', unsigned: true }) montant: number;
  @Column({ type: 'enum', enum: ['ESPECES', 'MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'VIREMENT', 'CARTE', 'AUTRE'] }) mode: 'ESPECES' | 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'VIREMENT' | 'CARTE' | 'AUTRE';
  @Column({ type: 'varchar', length: 120, nullable: true }) reference: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) note: string | null;
  @Column({ name: 'enregistre_par_id', type: 'int', unsigned: true }) enregistreParId: number;
  @Column({ name: 'enregistre_le', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) enregistreLe: Date;
}

@Entity('historique_statuts')
export class StatusHistory {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ name: 'reservation_id', type: 'int', unsigned: true }) reservationId: number;
  @Column({ name: 'ancien_statut', type: 'enum', enum: ['PROVISOIRE', 'FERME', 'EN_COURS', 'TERMINEE', 'REFUSEE', 'EXPIREE', 'ANNULEE'], nullable: true }) ancienStatut: ReservationStatus | null;
  @Column({ name: 'nouveau_statut', type: 'enum', enum: ['PROVISOIRE', 'FERME', 'EN_COURS', 'TERMINEE', 'REFUSEE', 'EXPIREE', 'ANNULEE'] }) nouveauStatut: ReservationStatus;
  @Column({ name: 'utilisateur_id', type: 'int', unsigned: true, nullable: true }) utilisateurId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) commentaire: string | null;
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ name: 'reservation_id', type: 'int', unsigned: true }) reservationId: number;
  @Column({ name: 'expediteur_id', type: 'int', unsigned: true }) expediteurId: number;
  @Column({ type: 'text' }) contenu: string;
  @Column({ name: 'envoye_le', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) envoyeLe: Date;
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true }) id: number;
  @Column({ name: 'utilisateur_id', type: 'int', unsigned: true }) utilisateurId: number;
  @Column({ name: 'reservation_id', type: 'int', unsigned: true, nullable: true }) reservationId: number | null;
  @Column({ length: 40 }) type: string;
  @Column({ length: 255 }) message: string;
  @Column({ name: 'cree_le', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) creeLe: Date;
  @Column({ name: 'lu_le', type: 'datetime', nullable: true }) luLe: Date | null;
}
