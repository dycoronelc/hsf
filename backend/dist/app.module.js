"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const preadmission_module_1 = require("./preadmission/preadmission.module");
const tickets_module_1 = require("./tickets/tickets.module");
const services_module_1 = require("./services/services.module");
const appointments_module_1 = require("./appointments/appointments.module");
const surveys_module_1 = require("./surveys/surveys.module");
const monitor_module_1 = require("./monitor/monitor.module");
const admin_module_1 = require("./admin/admin.module");
const notifications_module_1 = require("./notifications/notifications.module");
const reports_module_1 = require("./reports/reports.module");
const user_entity_1 = require("./users/entities/user.entity");
const service_entity_1 = require("./services/entities/service.entity");
const sede_entity_1 = require("./services/entities/sede.entity");
const preadmission_entity_1 = require("./preadmission/entities/preadmission.entity");
const ticket_entity_1 = require("./tickets/entities/ticket.entity");
const appointment_entity_1 = require("./appointments/entities/appointment.entity");
const survey_entity_1 = require("./surveys/entities/survey.entity");
const catalogs_module_1 = require("./catalogs/catalogs.module");
const nacionalidad_entity_1 = require("./catalogs/entities/nacionalidad.entity");
const provincia_entity_1 = require("./catalogs/entities/provincia.entity");
const distrito_entity_1 = require("./catalogs/entities/distrito.entity");
const corregimiento_entity_1 = require("./catalogs/entities/corregimiento.entity");
const notification_entity_1 = require("./notifications/entities/notification.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'sqlite',
                database: 'hospital_santa_fe.db',
                entities: [user_entity_1.User, service_entity_1.Service, sede_entity_1.Sede, preadmission_entity_1.Preadmission, ticket_entity_1.Ticket, appointment_entity_1.Appointment, survey_entity_1.Survey, nacionalidad_entity_1.Nacionalidad, provincia_entity_1.Provincia, distrito_entity_1.Distrito, corregimiento_entity_1.Corregimiento, notification_entity_1.Notification],
                synchronize: true,
                logging: false,
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            preadmission_module_1.PreadmissionModule,
            tickets_module_1.TicketsModule,
            services_module_1.ServicesModule,
            appointments_module_1.AppointmentsModule,
            surveys_module_1.SurveysModule,
            monitor_module_1.MonitorModule,
            admin_module_1.AdminModule,
            catalogs_module_1.CatalogsModule,
            notifications_module_1.NotificationsModule,
            reports_module_1.ReportsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map