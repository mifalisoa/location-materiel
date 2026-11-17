import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { Article, EventCollection } from '../database/entities.js';
import { AdminEventsController } from './admin-events.controller.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Article, EventCollection])],
  controllers: [EventsController, AdminEventsController],
  providers: [EventsService, AdminGuard],
})
export class EventsModule {}
