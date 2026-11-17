import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsString() @MinLength(1) nom: string;
  @IsString() @MinLength(1) prenom: string;
  @IsString() @MinLength(1) telephone: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() societe?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsString() notesAdmin?: string;
}

export class UpdateClientNotesDto { @IsOptional() @IsString() notesAdmin?: string; }
