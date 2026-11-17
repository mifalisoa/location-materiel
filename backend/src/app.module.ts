import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LogMailTransport, MailModule, SmtpTransport } from '@nestjs/mail';
import { createObserveModule } from '@nestjs/observe';
import { AvailabilityModule } from './availability/availability.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { EventsModule } from './events/events.module.js';
import { Article, Category, Client, EventCollection, Reservation, ReservationLine, StatusHistory, Unavailability, User } from './database/entities.js';
import { AppController } from './app.controller.js';
import { CommunicationsModule } from './communications/communications.module.js';
import { Message, Notification, ReservationEquipmentCheck, ReservationPayment } from './database/entities.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MailModule.forRootAsync({
      useFactory: () => ({
        transport: process.env.SMTP_URL
          ? new SmtpTransport({ url: process.env.SMTP_URL })
          : new LogMailTransport(),
        from: process.env.MAIL_FROM ?? 'Location matériel <no-reply@location-materiel.local>',
        retry: false,
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'location_projet',
      ssl: process.env.DB_SSL === 'true' ? {} : undefined,
      entities: [Article, Category, Client, EventCollection, Reservation, ReservationLine, StatusHistory, Unavailability, User, Message, Notification, ReservationEquipmentCheck, ReservationPayment],
      synchronize: false,
      retryAttempts: 2,
      retryDelay: 1500,
    }),
    CatalogModule,
    AvailabilityModule,
    AuthModule,
    ReservationsModule,
    ClientsModule,
    EventsModule,
    CommunicationsModule,
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
