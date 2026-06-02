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
exports.isSmtpDeliveryEnabled = isSmtpDeliveryEnabled;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const user_entity_1 = require("../users/entities/user.entity");
const nodemailer = require("nodemailer");
const qr_email_util_1 = require("./qr-email.util");
function isSmtpDeliveryEnabled() {
    return (process.env.NODE_ENV === 'production' || process.env.SMTP_SEND_IN_DEV === 'true');
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
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
        if (createDto.type !== notification_entity_1.NotificationType.EMAIL) {
            throw new Error('Solo se admiten notificaciones por correo electrónico');
        }
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
            if (notification.type !== notification_entity_1.NotificationType.EMAIL) {
                throw new Error(`Tipo de notificación no soportado: ${notification.type}`);
            }
            await this.sendEmail(user.email, notification.subject, notification.content);
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
    async sendEmail(to, subject, content, attachments) {
        if (isSmtpDeliveryEnabled()) {
            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@hospitalsantafe.com',
                to,
                subject,
                html: content,
                attachments,
            });
            this.logger.log(`Email sent to ${to}`);
        }
        else {
            this.logger.log(`[DEV] Email would be sent to ${to}: ${subject}`);
            if (attachments?.length) {
                this.logger.debug(`[DEV] ${attachments.length} attachment(s) (e.g. QR inline)`);
            }
            this.logger.debug(`Content: ${content}`);
        }
    }
    async sendEmailVerificationCode(to, code) {
        const content = `
      <div style="font-family: Arial, sans-serif; max-width: 480px;">
        <h2 style="color: #0066cc;">Verificación de correo</h2>
        <p>Su código de verificación para la preadmisión digital es:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${escapeHtml(code)}</p>
        <p style="color: #6b7280; font-size: 14px;">Válido por 15 minutos. No comparta este código.</p>
        <p>Hospital Santa Fe Panamá</p>
      </div>
    `;
        await this.sendEmail(to, 'Código de verificación - Hospital Santa Fe', content);
    }
    async sendPasswordResetEmail(to, resetUrl) {
        const safeUrl = escapeHtml(resetUrl);
        const content = `
      <div style="font-family: Arial, sans-serif; max-width: 480px;">
        <h2 style="color: #00816D;">Recuperación de contraseña</h2>
        <p>Recibimos una solicitud para restablecer su contraseña en la plataforma del Hospital Santa Fe.</p>
        <p style="margin: 24px 0;">
          <a href="${safeUrl}" style="background:#00816D;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
            Restablecer contraseña
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px;">El enlace expira en 1 hora. Si no solicitó este cambio, ignore este correo.</p>
        <p style="color:#6b7280;font-size:12px;word-break:break-all;">Enlace directo: ${safeUrl}</p>
        <p>Hospital Santa Fe Panamá</p>
      </div>
    `;
        await this.sendEmail(to, 'Recuperación de contraseña - Hospital Santa Fe', content);
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
    async sendPreadmissionConfirmation(data) {
        const to = data.email?.trim().toLowerCase();
        if (!to) {
            this.logger.warn(`Preadmisión #${data.id}: sin correo, no se envía confirmación`);
            return;
        }
        const nombre = [data.name1, data.name2, data.apellido1, data.apellido2]
            .filter(Boolean)
            .join(' ');
        const dept = data.departamento === 'RAD'
            ? 'Radiología'
            : data.departamento === 'LAB'
                ? 'Laboratorio'
                : data.departamento;
        const fechaRegistro = data.fechapreadmision.toLocaleDateString('es-PA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const fechaAtencion = data.fechaprobableatencion
            ? escapeHtml(data.fechaprobableatencion)
            : 'Por confirmar';
        const qrPayload = (0, qr_email_util_1.preadmissionQrPayload)(data.qrCode, data.id);
        let qrHtmlBlock = '';
        let attachments;
        try {
            const qrParts = await (0, qr_email_util_1.buildPreadmissionQrEmailParts)(qrPayload);
            qrHtmlBlock = qrParts.htmlBlock;
            attachments = qrParts.attachments;
        }
        catch (err) {
            this.logger.warn(`No se pudo generar imagen QR para preadmisión #${data.id}; se envía solo texto`, err);
            qrHtmlBlock = `
        <p style="font-family: monospace; font-size: 14px;"><strong>Código para su llegada:</strong> ${escapeHtml(qrPayload)}</p>`;
        }
        const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1f2937;">
        <h2 style="color: #0066cc;">Preadmisión recibida</h2>
        <p>Estimado(a) <strong>${escapeHtml(nombre)}</strong>,</p>
        <p>Hemos recibido su <strong>preadmisión digital</strong> en Hospital Santa Fe Panamá.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Referencia</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">#${data.id}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Área</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(dept)}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Fecha probable de atención</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${fechaAtencion}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Registrado el</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(fechaRegistro)}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Contacto</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(data.celular)}</td></tr>
        </table>
        ${qrHtmlBlock}
        <p>Conserve este correo. Al llegar al hospital, presente el <strong>QR</strong> o el código en recepción para registrar su llegada.</p>
        <p style="color: #6b7280; font-size: 14px;">Si no realizó esta preadmisión, contacte al hospital.</p>
        <p style="margin-top: 24px;">Hospital Santa Fe Panamá</p>
      </div>
    `;
        await this.sendEmail(to, `Confirmación de preadmisión #${data.id} - Hospital Santa Fe`, content, attachments);
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
            type: notification_entity_1.NotificationType.EMAIL,
            subject: `Turno ${ticketNumber} Llamado - Hospital Santa Fe`,
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