import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/notification.dto';
import * as nodemailer from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';
import {
  buildPreadmissionQrEmailParts,
  preadmissionQrPayload,
} from './qr-email.util';

export type PreadmissionConfirmationPayload = {
  id: number;
  email: string;
  name1: string;
  name2?: string | null;
  apellido1: string;
  apellido2?: string | null;
  departamento: string;
  fechaprobableatencion?: string | null;
  qrCode?: string | null;
  celular: string;
  fechapreadmision: Date;
};

/** Envío real SMTP: producción o desarrollo con SMTP_SEND_IN_DEV=true */
export function isSmtpDeliveryEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'production' || process.env.SMTP_SEND_IN_DEV === 'true'
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private emailTransporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
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

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    if (createDto.type !== NotificationType.EMAIL) {
      throw new Error('Solo se admiten notificaciones por correo electrónico');
    }

    const notification = this.notificationRepository.create({
      ...createDto,
      status: NotificationStatus.PENDING,
    });

    const saved = await this.notificationRepository.save(notification);

    this.sendNotification(saved).catch((error) => {
      this.logger.error(`Error sending notification ${saved.id}:`, error);
    });

    return saved;
  }

  private async sendNotification(notification: Notification): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: notification.recipientId },
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (notification.type !== NotificationType.EMAIL) {
        throw new Error(`Tipo de notificación no soportado: ${notification.type}`);
      }

      await this.sendEmail(user.email, notification.subject, notification.content);

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);
    } catch (error: any) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      await this.notificationRepository.save(notification);
      throw error;
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    content: string,
    attachments?: Attachment[],
  ): Promise<void> {
    if (isSmtpDeliveryEnabled()) {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@hospitalsantafe.com',
        to,
        subject,
        html: content,
        attachments,
      });
      this.logger.log(`Email sent to ${to}`);
    } else {
      this.logger.log(`[DEV] Email would be sent to ${to}: ${subject}`);
      if (attachments?.length) {
        this.logger.debug(`[DEV] ${attachments.length} attachment(s) (e.g. QR inline)`);
      }
      this.logger.debug(`Content: ${content}`);
    }
  }

  /** Código de verificación de correo en preadmisión */
  async sendEmailVerificationCode(to: string, code: string): Promise<void> {
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

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
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

  async sendTicketCreated(
    userId: number,
    ticketNumber: string,
    serviceName: string,
    qrCode?: string,
  ): Promise<void> {
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
      type: NotificationType.EMAIL,
      subject: `Turno ${ticketNumber} - Hospital Santa Fe`,
      content,
      relatedEntityType: 'ticket',
    });
  }

  async sendPreadmissionConfirmation(data: PreadmissionConfirmationPayload): Promise<void> {
    const to = data.email?.trim().toLowerCase();
    if (!to) {
      this.logger.warn(`Preadmisión #${data.id}: sin correo, no se envía confirmación`);
      return;
    }

    const nombre = [data.name1, data.name2, data.apellido1, data.apellido2]
      .filter(Boolean)
      .join(' ');
    const dept =
      data.departamento === 'RAD'
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

    const qrPayload = preadmissionQrPayload(data.qrCode, data.id);
    let qrHtmlBlock = '';
    let attachments: Attachment[] | undefined;
    try {
      const qrParts = await buildPreadmissionQrEmailParts(qrPayload);
      qrHtmlBlock = qrParts.htmlBlock;
      attachments = qrParts.attachments;
    } catch (err) {
      this.logger.warn(
        `No se pudo generar imagen QR para preadmisión #${data.id}; se envía solo texto`,
        err,
      );
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

    await this.sendEmail(
      to,
      `Confirmación de preadmisión #${data.id} - Hospital Santa Fe`,
      content,
      attachments,
    );
  }

  async sendTicketCalled(
    userId: number,
    ticketNumber: string,
    windowNumber: string,
  ): Promise<void> {
    const content = `
      <h2>Su Turno ha Sido Llamado</h2>
      <p>Por favor diríjase a la ventanilla ${windowNumber}</p>
      <p><strong>Número de Turno:</strong> ${ticketNumber}</p>
      <p>Hospital Santa Fe Panamá</p>
    `;

    await this.create({
      recipientId: userId,
      type: NotificationType.EMAIL,
      subject: `Turno ${ticketNumber} Llamado - Hospital Santa Fe`,
      content,
      relatedEntityType: 'ticket',
    });
  }

  async findAll(userId?: number): Promise<Notification[]> {
    const where = userId ? { recipientId: userId } : {};
    return this.notificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
