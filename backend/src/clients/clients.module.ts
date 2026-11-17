import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { Client } from '../database/entities.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({ imports: [AuthModule, TypeOrmModule.forFeature([Client])], controllers: [ClientsController], providers: [ClientsService, AdminGuard] })
export class ClientsModule {}
