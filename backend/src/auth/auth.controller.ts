import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('inscription') register(@Body() body: RegisterDto) { return this.auth.register(body); }
  @Post('connexion') login(@Body() body: LoginDto) { return this.auth.login(body.email, body.motDePasse); }
}
