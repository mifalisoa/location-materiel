import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Client, Message, Notification, Reservation } from '../database/entities.js';
import { CommunicationsController } from './communications.controller.js';
import { CommunicationsService } from './communications.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Client, Message, Notification, Reservation])],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
