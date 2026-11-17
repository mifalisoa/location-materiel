import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString() nom: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug: string;
  @IsOptional() @IsInt() ordre?: number;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
  @IsOptional() @IsInt() ordre?: number;
}

export class CreateArticleDto {
  @IsInt() @Min(1) categorieId: number;
  @IsString() nom: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsInt() @Min(0) prixJour: number;
  @IsOptional() @IsInt() @Min(0) caution?: number;
  @IsInt() @Min(0) quantiteTotale: number;
  @IsOptional() @IsInt() @Min(0) margeJours?: number;
}

export class UpdateArticleDto {
  @IsOptional() @IsInt() @Min(1) categorieId?: number;
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsInt() @Min(0) prixJour?: number;
  @IsOptional() @IsInt() @Min(0) caution?: number;
  @IsOptional() @IsInt() @Min(0) quantiteTotale?: number;
  @IsOptional() @IsInt() @Min(0) margeJours?: number;
}
