import { ArrayUnique, IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateEventDto {
  @IsString() @MaxLength(120) nom: string;
  @IsString() @MaxLength(140) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug: string;
  @IsOptional() @IsString() @MaxLength(180) sousTitre?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(255) imageUrl?: string;
  @IsOptional() @IsInt() ordre?: number;
  @IsOptional() @IsArray() @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) articleIds?: number[];
}

export class UpdateEventDto {
  @IsOptional() @IsString() @MaxLength(120) nom?: string;
  @IsOptional() @IsString() @MaxLength(140) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
  @IsOptional() @IsString() @MaxLength(180) sousTitre?: string | null;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() @MaxLength(255) imageUrl?: string | null;
  @IsOptional() @IsInt() ordre?: number;
  @IsOptional() @IsArray() @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) articleIds?: number[];
}

export class UpdateEventActiveDto {
  @IsBoolean() actif: boolean;
}
