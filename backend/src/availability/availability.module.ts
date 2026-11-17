import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, Unavailability } from '../database/entities.js';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';
import { AdminUnavailabilityController } from './admin-unavailability.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminGuard } from '../auth/admin.guard.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Article, Unavailability])],
  controllers: [AvailabilityController, AdminUnavailabilityController],
  providers: [AvailabilityService, AdminGuard],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
