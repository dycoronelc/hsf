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
import { Survey } from './surveys/entities/survey.entity';
import { CatalogsModule } from './catalogs/catalogs.module';
import { Nacionalidad } from './catalogs/entities/nacionalidad.entity';
import { Provincia } from './catalogs/entities/provincia.entity';
import { Distrito } from './catalogs/entities/distrito.entity';
import { Corregimiento } from './catalogs/entities/corregimiento.entity';
import { Notification } from './notifications/entities/notification.entity';
import { IntegrationLog } from './integrations/entities/integration-log.entity';
import { IntegrationsModule } from './integrations/integrations.module';
import { AuditModule } from './audit/audit.module';
import { AuditLog } from './audit/entities/audit-log.entity';
import { PasswordResetToken } from './auth/entities/password-reset-token.entity';
import { VerificationCode } from './auth/entities/verification-code.entity';
import { RolePermission } from './admin/entities/role-permission.entity';
import { AdminRoleMatrixRow } from './admin/entities/admin-role-matrix-row.entity';

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
      entities: [
        User,
        Service,
        Sede,
        Preadmission,
        Ticket,
        Survey,
        Nacionalidad,
        Provincia,
        Distrito,
        Corregimiento,
        Notification,
        IntegrationLog,
        AuditLog,
        PasswordResetToken,
        VerificationCode,
        RolePermission,
        AdminRoleMatrixRow,
      ],
      synchronize: true, // Solo para desarrollo, usar migrations en producción
      logging: false,
    }),
    AuditModule,
    AuthModule,
    UsersModule,
    PreadmissionModule,
    TicketsModule,
    ServicesModule,
    SurveysModule,
    MonitorModule,
    AdminModule,
    CatalogsModule,
    NotificationsModule,
    ReportsModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
