import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client, User } from '../database/entities.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const configuredJwtSecret = process.env.JWT_SECRET?.trim();
if (process.env.NODE_ENV === 'production' && (!configuredJwtSecret || configuredJwtSecret.length < 32)) {
  throw new Error('En production, JWT_SECRET doit contenir au moins 32 caractères aléatoires.');
}

@Module({
  imports: [TypeOrmModule.forFeature([User, Client]), JwtModule.register({ secret: configuredJwtSecret || 'change-this-development-secret', signOptions: { expiresIn: '12h' } })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard, AuthService],
})
export class AuthModule {}
