"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const user_entity_1 = require("../users/entities/user.entity");
const nodemailer = require("nodemailer");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(notificationRepository, userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'test@example.com',
                pass: process.env.SMTP_PASS || 'password',
            },
        });
    }
    async create(createDto) {
        const notification = this.notificationRepository.create({
            ...createDto,
            status: notification_entity_1.NotificationStatus.PENDING,
        });
        const saved = await this.notificationRepository.save(notification);
        this.sendNotification(saved).catch((error) => {
            this.logger.error(`Error sending notification ${saved.id}:`, error);
        });
        return saved;
    }
    async sendNotification(notification) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: notification.recipientId },
            });
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            switch (notification.type) {
                case notification_entity_1.NotificationType.EMAIL:
                    await this.sendEmail(user.email, notification.subject, notification.content);
                    break;
                case notification_entity_1.NotificationType.SMS:
                    await this.sendSMS(user.phone ?? '', notification.content);
                    break;
                case notification_entity_1.NotificationType.WHATSAPP:
                    await this.sendWhatsApp(user.phone ?? '', notification.content);
                    break;
                default:
                    throw new Error(`Tipo de notificación no soportado: ${notification.type}`);
            }
            notification.status = notification_entity_1.NotificationStatus.SENT;
            notification.sentAt = new Date();
            await this.notificationRepository.save(notification);
        }
        catch (error) {
            notification.status = notification_entity_1.NotificationStatus.FAILED;
            notification.errorMessage = error.message;
            await this.notificationRepository.save(notification);
            throw error;
        }
    }
    async sendEmail(to, subject, content) {
        if (process.env.NODE_ENV === 'production') {
            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@hospitalsantafe.com',
                to,
                subject,
                html: content,
            });
            this.logger.log(`Email sent to ${to}`);
        }
        else {
            this.logger.log(`[DEV] Email would be sent to ${to}: ${subject}`);
            this.logger.debug(`Content: ${content}`);
        }
    }
    async sendSMS(phone, message) {
        if (process.env.NODE_ENV === 'production' && process.env.TWILIO_ACCOUNT_SID) {
            this.logger.log(`SMS would be sent to ${phone}: ${message}`);
        }
        else {
            this.logger.log(`[DEV] SMS would be sent to ${phone}: ${message}`);
        }
    }
    async sendWhatsApp(phone, message) {
        if (process.env.NODE_ENV === 'production' && process.env.WHATSAPP_API_KEY) {
            this.logger.log(`WhatsApp would be sent to ${phone}: ${message}`);
        }
        else {
            this.logger.log(`[DEV] WhatsApp would be sent to ${phone}: ${message}`);
        }
    }
    async sendAppointmentConfirmation(userId, appointmentId, appointmentDate, serviceName) {
        const dateStr = appointmentDate.toLocaleDateString('es-PA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const content = `
      <h2>Confirmación de Cita</h2>
      <p>Su cita ha sido confirmada:</p>
      <ul>
        <li><strong>Servicio:</strong> ${serviceName}</li>
        <li><strong>Fecha y Hora:</strong> ${dateStr}</li>
      </ul>
      <p>Por favor llegue 15 minutos antes de su cita.</p>
      <p>Hospital Santa Fe Panamá</p>
    `;
        await this.create({
            recipientId: userId,
            type: notification_entity_1.NotificationType.EMAIL,
            subject: 'Confirmación de Cita - Hospital Santa Fe',
            content,
            relatedEntityType: 'appointment',
            relatedEntityId: appointmentId,
        });
    }
    async sendAppointmentReminder(userId, appointmentId, appointmentDate, serviceName) {
        const dateStr = appointmentDate.toLocaleDateString('es-PA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const content = `
      <h2>Recordatorio de Cita</h2>
      <p>Le recordamos que tiene una cita programada:</p>
      <ul>
        <li><strong>Servicio:</strong> ${serviceName}</li>
        <li><strong>Fecha y Hora:</strong> ${dateStr}</li>
      </ul>
      <p>Por favor llegue 15 minutos antes de su cita.</p>
      <p>Hospital Santa Fe Panamá</p>
    `;
        await this.create({
            recipientId: userId,
            type: notification_entity_1.NotificationType.EMAIL,
            subject: 'Recordatorio de Cita - Hospital Santa Fe',
            content,
            relatedEntityType: 'appointment',
            relatedEntityId: appointmentId,
        });
    }
    async sendTicketCreated(userId, ticketNumber, serviceName, qrCode) {
        const content = `
      <h2>Turno Creado</h2>
      <p>Su turno ha sido creado exitosamente:</p>
      <ul>
        <li><strong>Número de Turno:</strong> ${ticketNumber}</li>
        <li><strong>Servicio:</strong> ${serviceName}</li>
      </ul>
      ${qrCode ? `<p><strong>Código QR:</strong> ${qrCode}</p>` : ''}
      <p>Por favor presente este número cuando sea llamado.</p>
      <p>Hospital Santa Fe Panamá</p>
    `;
        await this.create({
            recipientId: userId,
            type: notification_entity_1.NotificationType.EMAIL,
            subject: `Turno ${ticketNumber} - Hospital Santa Fe`,
            content,
            relatedEntityType: 'ticket',
        });
    }
    async sendTicketCalled(userId, ticketNumber, windowNumber) {
        const content = `
      <h2>Su Turno ha Sido Llamado</h2>
      <p>Por favor diríjase a la ventanilla ${windowNumber}</p>
      <p><strong>Número de Turno:</strong> ${ticketNumber}</p>
      <p>Hospital Santa Fe Panamá</p>
    `;
        await this.create({
            recipientId: userId,
            type: notification_entity_1.NotificationType.SMS,
            subject: `Turno ${ticketNumber} Llamado`,
            content,
            relatedEntityType: 'ticket',
        });
    }
    async findAll(userId) {
        const where = userId ? { recipientId: userId } : {};
        return this.notificationRepository.find({
            where,
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map