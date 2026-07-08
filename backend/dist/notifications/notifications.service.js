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
exports.NotificationsService = exports.isSmtpDeliveryEnabled = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const user_entity_1 = require("../users/entities/user.entity");
const nodemailer = require("nodemailer");
const qr_email_util_1 = require("./qr-email.util");
const email_template_util_1 = require("./email-template.util");
const smtp_config_1 = require("./smtp.config");
var smtp_config_2 = require("./smtp.config");
Object.defineProperty(exports, "isSmtpDeliveryEnabled", { enumerable: true, get: function () { return smtp_config_2.isSmtpDeliveryEnabled; } });
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(notificationRepository, userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.emailTransporter = nodemailer.createTransport({
            host: (0, smtp_config_1.getSmtpHost)(),
            port: (0, smtp_config_1.getSmtpPort)(),
            secure: false,
            auth: {
                user: (0, smtp_config_1.getSmtpUser)() || 'test@example.com',
                pass: (0, smtp_config_1.getSmtpPass)() || 'password',
            },
        });
    }
    async checkSmtpConnectivity() {
        if (!(0, smtp_config_1.isSmtpDeliveryEnabled)()) {
            return {
                deliveryEnabled: false,
                configured: false,
                ok: true,
                message: 'Envío SMTP deshabilitado (modo desarrollo sin SMTP_SEND_IN_DEV).',
            };
        }
        try {
            (0, smtp_config_1.assertSmtpReadyForSend)();
            await this.emailTransporter.verify();
            return {
                deliveryEnabled: true,
                configured: true,
                ok: true,
                message: 'Conexión SMTP verificada correctamente.',
            };
        }
        catch (err) {
            return {
                deliveryEnabled: true,
                configured: Boolean((0, smtp_config_1.getSmtpUser)() && (0, smtp_config_1.getSmtpPass)()),
                ok: false,
                message: (0, smtp_config_1.formatSmtpError)(err),
            };
        }
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
        if ((0, smtp_config_1.isSmtpDeliveryEnabled)()) {
            (0, smtp_config_1.assertSmtpReadyForSend)();
            try {
                await this.emailTransporter.sendMail({
                    from: (0, smtp_config_1.getSmtpFrom)(),
                    to,
                    subject,
                    html: content,
                    attachments,
                });
                this.logger.log(`Email sent to ${to}`);
            }
            catch (err) {
                this.logger.error(`SMTP send failed to ${to}: ${(0, smtp_config_1.formatSmtpError)(err)}`);
                throw err;
            }
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
        const content = (0, email_template_util_1.buildEmailHtml)({
            title: 'Verificación de correo',
            preheader: `Su código de verificación es ${code}`,
            bodyHtml: [
                (0, email_template_util_1.emailParagraph)('Use el siguiente código para confirmar su correo en la <strong>preadmisión digital</strong>:'),
                (0, email_template_util_1.emailCodeDisplay)(code),
                (0, email_template_util_1.emailMutedNote)('El código es válido por 15 minutos. No lo comparta con nadie.'),
            ].join(''),
        });
        await this.sendEmail(to, 'Código de verificación - Hospital Santa Fe', content);
    }
    async sendPasswordResetEmail(to, resetUrl) {
        const safeUrl = (0, email_template_util_1.escapeHtml)(resetUrl);
        const content = (0, email_template_util_1.buildEmailHtml)({
            title: 'Recuperación de contraseña',
            preheader: 'Restablezca su contraseña de la plataforma Hospital Santa Fe',
            bodyHtml: [
                (0, email_template_util_1.emailParagraph)('Recibimos una solicitud para restablecer su contraseña en la plataforma del Hospital Santa Fe.'),
                (0, email_template_util_1.emailButton)(resetUrl, 'Restablecer contraseña'),
                (0, email_template_util_1.emailMutedNote)('El enlace expira en 1 hora. Si no solicitó este cambio, ignore este correo.'),
                (0, email_template_util_1.emailSmallPrint)(`Enlace directo: ${safeUrl}`),
            ].join(''),
        });
        await this.sendEmail(to, 'Recuperación de contraseña - Hospital Santa Fe', content);
    }
    async sendTicketCreated(userId, ticketNumber, serviceName, qrCode) {
        const qrBlock = qrCode
            ? (0, email_template_util_1.emailHighlightBox)(`<p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Código QR:</strong></p>
           <p style="margin:0;font-family:Consolas,Monaco,'Courier New',monospace;font-size:14px;color:#00816D;word-break:break-all;">${(0, email_template_util_1.escapeHtml)(qrCode)}</p>`)
            : '';
        const content = (0, email_template_util_1.buildEmailHtml)({
            title: 'Turno creado',
            preheader: `Su turno ${ticketNumber} fue registrado correctamente`,
            bodyHtml: [
                (0, email_template_util_1.emailParagraph)('Su turno ha sido creado exitosamente. Conserve este correo para su referencia.'),
                (0, email_template_util_1.emailDataTable)([
                    { label: 'Número de turno', value: `<strong>${(0, email_template_util_1.escapeHtml)(ticketNumber)}</strong>` },
                    { label: 'Servicio', value: (0, email_template_util_1.escapeHtml)(serviceName) },
                ]),
                qrBlock,
                (0, email_template_util_1.emailMutedNote)('Presente su número o código QR cuando sea llamado en el hospital.'),
            ].join(''),
        });
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
            ? (0, email_template_util_1.escapeHtml)(data.fechaprobableatencion)
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
        <p style="margin:0;font-family:Consolas,Monaco,'Courier New',monospace;font-size:14px;">
          <strong>Código para su llegada:</strong> ${(0, email_template_util_1.escapeHtml)(qrPayload)}
        </p>`;
        }
        const content = (0, email_template_util_1.buildEmailHtml)({
            title: 'Preadmisión recibida',
            preheader: `Confirmación de preadmisión #${data.id} — ${dept}`,
            bodyHtml: [
                (0, email_template_util_1.emailParagraph)(`Estimado(a) <strong>${(0, email_template_util_1.escapeHtml)(nombre)}</strong>,`),
                (0, email_template_util_1.emailParagraph)(`Hemos recibido su <strong>preadmisión digital</strong> en Hospital Santa Fe Panamá. ${(0, email_template_util_1.emailBadge)(dept)}`),
                (0, email_template_util_1.emailDataTable)([
                    { label: 'Referencia', value: `#${data.id}` },
                    { label: 'Área', value: (0, email_template_util_1.escapeHtml)(dept) },
                    { label: 'Fecha probable de atención', value: fechaAtencion },
                    { label: 'Registrado el', value: (0, email_template_util_1.escapeHtml)(fechaRegistro) },
                    { label: 'Contacto', value: (0, email_template_util_1.escapeHtml)(data.celular) },
                ]),
                qrHtmlBlock,
                (0, email_template_util_1.emailHighlightBox)((0, email_template_util_1.emailParagraph)('Conserve este correo. Al llegar al hospital, presente el <strong>QR</strong> o el código en recepción para registrar su llegada.')),
                (0, email_template_util_1.emailMutedNote)('Si no realizó esta preadmisión, contacte al hospital.'),
            ].join(''),
        });
        await this.sendEmail(to, `Confirmación de preadmisión #${data.id} - Hospital Santa Fe`, content, attachments);
    }
    async sendTicketCalled(userId, ticketNumber, windowNumber) {
        const content = (0, email_template_util_1.buildEmailHtml)({
            title: 'Su turno ha sido llamado',
            preheader: `Diríjase a la ventanilla ${windowNumber}`,
            bodyHtml: [
                (0, email_template_util_1.emailParagraph)(`Su turno <strong>${(0, email_template_util_1.escapeHtml)(ticketNumber)}</strong> ha sido llamado. Por favor diríjase a la ventanilla indicada.`),
                (0, email_template_util_1.emailHighlightBox)(`<p style="margin:0;font-size:28px;font-weight:700;color:#00816D;text-align:center;">Ventanilla ${(0, email_template_util_1.escapeHtml)(windowNumber)}</p>`),
                (0, email_template_util_1.emailDataTable)([
                    { label: 'Número de turno', value: `<strong>${(0, email_template_util_1.escapeHtml)(ticketNumber)}</strong>` },
                    { label: 'Ventanilla', value: (0, email_template_util_1.escapeHtml)(windowNumber) },
                ]),
                (0, email_template_util_1.emailMutedNote)('Le recomendamos acercarse de inmediato para no perder su turno.'),
            ].join(''),
        });
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