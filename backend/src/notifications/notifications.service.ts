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
import {
  buildEmailHtml,
  emailBadge,
  emailButton,
  emailCodeDisplay,
  emailDataTable,
  emailHighlightBox,
  emailMutedNote,
  emailParagraph,
  emailSmallPrint,
  escapeHtml,
} from './email-template.util';
import {
  assertSmtpReadyForSend,
  formatSmtpError,
  getSmtpFrom,
  getSmtpHost,
  getSmtpPass,
  getSmtpPort,
  getSmtpUser,
  isSmtpDeliveryEnabled,
} from './smtp.config';

export { isSmtpDeliveryEnabled } from './smtp.config';

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
      host: getSmtpHost(),
      port: getSmtpPort(),
      secure: false,
      auth: {
        user: getSmtpUser() || 'test@example.com',
        pass: getSmtpPass() || 'password',
      },
    });
  }

  async checkSmtpConnectivity(): Promise<{
    deliveryEnabled: boolean;
    configured: boolean;
    ok: boolean;
    message: string;
  }> {
    if (!isSmtpDeliveryEnabled()) {
      return {
        deliveryEnabled: false,
        configured: false,
        ok: true,
        message: 'Envío SMTP deshabilitado (modo desarrollo sin SMTP_SEND_IN_DEV).',
      };
    }
    try {
      assertSmtpReadyForSend();
      await this.emailTransporter.verify();
      return {
        deliveryEnabled: true,
        configured: true,
        ok: true,
        message: 'Conexión SMTP verificada correctamente.',
      };
    } catch (err) {
      return {
        deliveryEnabled: true,
        configured: Boolean(getSmtpUser() && getSmtpPass()),
        ok: false,
        message: formatSmtpError(err),
      };
    }
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
      assertSmtpReadyForSend();
      try {
        await this.emailTransporter.sendMail({
          from: getSmtpFrom(),
          to,
          subject,
          html: content,
          attachments,
        });
        this.logger.log(`Email sent to ${to}`);
      } catch (err) {
        this.logger.error(`SMTP send failed to ${to}: ${formatSmtpError(err)}`);
        throw err;
      }
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
    const content = buildEmailHtml({
      title: 'Verificación de correo',
      preheader: `Su código de verificación es ${code}`,
      bodyHtml: [
        emailParagraph('Use el siguiente código para confirmar su correo en la <strong>preadmisión digital</strong>:'),
        emailCodeDisplay(code),
        emailMutedNote('El código es válido por 15 minutos. No lo comparta con nadie.'),
      ].join(''),
    });
    await this.sendEmail(to, 'Código de verificación - Hospital Santa Fe', content);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const safeUrl = escapeHtml(resetUrl);
    const content = buildEmailHtml({
      title: 'Recuperación de contraseña',
      preheader: 'Restablezca su contraseña de la plataforma Hospital Santa Fe',
      bodyHtml: [
        emailParagraph(
          'Recibimos una solicitud para restablecer su contraseña en la plataforma del Hospital Santa Fe.',
        ),
        emailButton(resetUrl, 'Restablecer contraseña'),
        emailMutedNote('El enlace expira en 1 hora. Si no solicitó este cambio, ignore este correo.'),
        emailSmallPrint(`Enlace directo: ${safeUrl}`),
      ].join(''),
    });
    await this.sendEmail(to, 'Recuperación de contraseña - Hospital Santa Fe', content);
  }

  async sendTicketCreated(
    userId: number,
    ticketNumber: string,
    serviceName: string,
    qrCode?: string,
  ): Promise<void> {
    const qrBlock = qrCode
      ? emailHighlightBox(
          `<p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Código QR:</strong></p>
           <p style="margin:0;font-family:Consolas,Monaco,'Courier New',monospace;font-size:14px;color:#00816D;word-break:break-all;">${escapeHtml(qrCode)}</p>`,
        )
      : '';

    const content = buildEmailHtml({
      title: 'Turno creado',
      preheader: `Su turno ${ticketNumber} fue registrado correctamente`,
      bodyHtml: [
        emailParagraph('Su turno ha sido creado exitosamente. Conserve este correo para su referencia.'),
        emailDataTable([
          { label: 'Número de turno', value: `<strong>${escapeHtml(ticketNumber)}</strong>` },
          { label: 'Servicio', value: escapeHtml(serviceName) },
        ]),
        qrBlock,
        emailMutedNote('Presente su número o código QR cuando sea llamado en el hospital.'),
      ].join(''),
    });

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
        <p style="margin:0;font-family:Consolas,Monaco,'Courier New',monospace;font-size:14px;">
          <strong>Código para su llegada:</strong> ${escapeHtml(qrPayload)}
        </p>`;
    }

    const content = buildEmailHtml({
      title: 'Preadmisión recibida',
      preheader: `Confirmación de preadmisión #${data.id} — ${dept}`,
      bodyHtml: [
        emailParagraph(`Estimado(a) <strong>${escapeHtml(nombre)}</strong>,`),
        emailParagraph(
          `Hemos recibido su <strong>preadmisión digital</strong> en Hospital Santa Fe Panamá. ${emailBadge(dept)}`,
        ),
        emailDataTable([
          { label: 'Referencia', value: `#${data.id}` },
          { label: 'Área', value: escapeHtml(dept) },
          { label: 'Fecha probable de atención', value: fechaAtencion },
          { label: 'Registrado el', value: escapeHtml(fechaRegistro) },
          { label: 'Contacto', value: escapeHtml(data.celular) },
        ]),
        qrHtmlBlock,
        emailHighlightBox(
          emailParagraph(
            'Conserve este correo. Al llegar al hospital, presente el <strong>QR</strong> o el código en recepción para registrar su llegada.',
          ),
        ),
        emailMutedNote('Si no realizó esta preadmisión, contacte al hospital.'),
      ].join(''),
    });

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
    const content = buildEmailHtml({
      title: 'Su turno ha sido llamado',
      preheader: `Diríjase a la ventanilla ${windowNumber}`,
      bodyHtml: [
        emailParagraph(
          `Su turno <strong>${escapeHtml(ticketNumber)}</strong> ha sido llamado. Por favor diríjase a la ventanilla indicada.`,
        ),
        emailHighlightBox(
          `<p style="margin:0;font-size:28px;font-weight:700;color:#00816D;text-align:center;">Ventanilla ${escapeHtml(windowNumber)}</p>`,
        ),
        emailDataTable([
          { label: 'Número de turno', value: `<strong>${escapeHtml(ticketNumber)}</strong>` },
          { label: 'Ventanilla', value: escapeHtml(windowNumber) },
        ]),
        emailMutedNote('Le recomendamos acercarse de inmediato para no perder su turno.'),
      ].join(''),
    });

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
