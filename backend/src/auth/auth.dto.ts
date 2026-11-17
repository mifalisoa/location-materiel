import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) motDePasse: string;
  @IsString() @IsNotEmpty() nom: string;
  @IsString() @IsNotEmpty() prenom: string;
  @IsString() @IsNotEmpty() telephone: string;
  @IsOptional() @IsString() societe?: string;
  @IsOptional() @IsString() adresse?: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() motDePasse: string;
}
