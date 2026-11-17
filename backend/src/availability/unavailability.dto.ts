import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateUnavailabilityDto {
  @IsInt() @Min(1) articleId: number;
  @IsInt() @Min(1) quantite: number;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateDebut: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFin?: string;
  @IsOptional() @IsIn(['REPARATION', 'HORS_SERVICE', 'AUTRE']) motif?: 'REPARATION' | 'HORS_SERVICE' | 'AUTRE';
  @IsOptional() @IsString() note?: string;
}
