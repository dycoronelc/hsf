import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PreadmissionModule } from './preadmission/preadmission.module';
import { TicketsModule } from './tickets/tickets.module';
import { ServicesModule } from './services/services.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SurveysModule } from './surveys/surveys.module';
import { MonitorModule } from './monitor/monitor.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { User } from './users/entities/user.entity';
import { Service } from './services/entities/service.entity';
import { Sede } from './services/entities/sede.entity';
import { Preadmission } from './preadmission/entities/preadmission.entity';
import { Ticket } from './tickets/entities/ticket.entity';
import { Appointment } from './appointments/entities/appointment.entity';
import { Survey } from './surveys/entities/survey.entity';
import { CatalogsModule } from './catalogs/catalogs.module';
import { Nacionalidad } from './catalogs/entities/nacionalidad.entity';
import { Provincia } from './catalogs/entities/provincia.entity';
import { Distrito } from './catalogs/entities/distrito.entity';
import { Corregimiento } from './catalogs/entities/corregimiento.entity';
import { Notification } from './notifications/entities/notification.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hospital_santa_fe',
      ssl: process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      entities: [User, Service, Sede, Preadmission, Ticket, Appointment, Survey, Nacionalidad, Provincia, Distrito, Corregimiento, Notification],
      synchronize: true, // Solo para desarrollo, usar migrations en producción
      logging: false,
    }),
    AuthModule,
    UsersModule,
    PreadmissionModule,
    TicketsModule,
    ServicesModule,
    AppointmentsModule,
    SurveysModule,
    MonitorModule,
    AdminModule,
    CatalogsModule,
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
