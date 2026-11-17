import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReservationItemDto {
  @IsInt() @Min(1) articleId: number;
  @IsInt() @Min(1) quantite: number;
}

export class CreateReservationDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateDebut: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFin: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ReservationItemDto) articles: ReservationItemDto[];
  @IsOptional() @IsIn(['RETRAIT', 'LIVRAISON']) modeRemise?: 'RETRAIT' | 'LIVRAISON';
  @IsOptional() @IsString() adresseLivraison?: string;
  @IsOptional() @IsString() noteClient?: string;
}

export class DecideReservationDto {
  @IsIn(['FERME', 'REFUSEE']) statut: 'FERME' | 'REFUSEE';
  @IsOptional() @IsString() motif?: string;
}

export class ManualReservationDto extends CreateReservationDto {
  @IsInt() @Min(1) clientId: number;
  @IsOptional() @IsIn([true, false]) stockForce?: boolean;
  @IsOptional() @IsIn(['PROVISOIRE', 'FERME']) statutInitial?: 'PROVISOIRE' | 'FERME';
}

export class UpdateReservationStatusDto {
  @IsIn(['EN_COURS', 'TERMINEE', 'ANNULEE']) statut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  @IsOptional() @IsString() commentaire?: string;
}

export class EquipmentCheckLineDto {
  @IsInt() @Min(1) ligneReservationId: number;
  @IsInt() @Min(1) quantite: number;
  @IsIn(['BON', 'ABIME', 'MANQUANT']) etat: 'BON' | 'ABIME' | 'MANQUANT';
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class EquipmentCheckDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => EquipmentCheckLineDto)
  lignes: EquipmentCheckLineDto[];
  @IsOptional() @IsString() @MaxLength(255) commentaire?: string;
}

export class CreateReservationPaymentDto {
  @IsIn(['PAIEMENT_LOCATION', 'REMBOURSEMENT_LOCATION', 'CAUTION_RECUE', 'CAUTION_RESTITUEE'])
  type: 'PAIEMENT_LOCATION' | 'REMBOURSEMENT_LOCATION' | 'CAUTION_RECUE' | 'CAUTION_RESTITUEE';
  @IsInt() @Min(1) montant: number;
  @IsIn(['ESPECES', 'MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'VIREMENT', 'CARTE', 'AUTRE'])
  mode: 'ESPECES' | 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'VIREMENT' | 'CARTE' | 'AUTRE';
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
