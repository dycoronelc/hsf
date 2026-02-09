import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/notification.dto';
import * as nodemailer from 'nodemailer';

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
    // Configurar transporter de email (usar variables de entorno en producción)
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    });
  }

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...createDto,
      status: NotificationStatus.PENDING,
    });

    const saved = await this.notificationRepository.save(notification);

    // Enviar notificación de forma asíncrona
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

      switch (notification.type) {
        case NotificationType.EMAIL:
          await this.sendEmail(user.email, notification.subject, notification.content);
          break;
        case NotificationType.SMS:
          await this.sendSMS(user.phone ?? '', notification.content);
          break;
        case NotificationType.WHATSAPP:
          await this.sendWhatsApp(user.phone ?? '', notification.content);
          break;
        default:
          throw new Error(`Tipo de notificación no soportado: ${notification.type}`);
      }

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

  private async sendEmail(to: string, subject: string, content: string): Promise<void> {
    // En desarrollo, solo loguear. En producción, enviar email real
    if (process.env.NODE_ENV === 'production') {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@hospitalsantafe.com',
        to,
        subject,
        html: content,
      });
      this.logger.log(`Email sent to ${to}`);
    } else {
      this.logger.log(`[DEV] Email would be sent to ${to}: ${subject}`);
      this.logger.debug(`Content: ${content}`);
    }
  }

  private async sendSMS(phone: string, message: string): Promise<void> {
    // Implementación básica - en producción usar Twilio u otro servicio
    if (process.env.NODE_ENV === 'production' && process.env.TWILIO_ACCOUNT_SID) {
      // TODO: Implementar con Twilio
      this.logger.log(`SMS would be sent to ${phone}: ${message}`);
    } else {
      this.logger.log(`[DEV] SMS would be sent to ${phone}: ${message}`);
    }
  }

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    // Implementación básica - en producción usar WhatsApp Business API
    if (process.env.NODE_ENV === 'production' && process.env.WHATSAPP_API_KEY) {
      // TODO: Implementar con WhatsApp Business API
      this.logger.log(`WhatsApp would be sent to ${phone}: ${message}`);
    } else {
      this.logger.log(`[DEV] WhatsApp would be sent to ${phone}: ${message}`);
    }
  }

  // Métodos helper para notificaciones comunes
  async sendAppointmentConfirmation(
    userId: number,
    appointmentId: number,
    appointmentDate: Date,
    serviceName: string,
  ): Promise<void> {
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
      type: NotificationType.EMAIL,
      subject: 'Confirmación de Cita - Hospital Santa Fe',
      content,
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
    });
  }

  async sendAppointmentReminder(
    userId: number,
    appointmentId: number,
    appointmentDate: Date,
    serviceName: string,
  ): Promise<void> {
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
      type: NotificationType.EMAIL,
      subject: 'Recordatorio de Cita - Hospital Santa Fe',
      content,
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
    });
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
      type: NotificationType.SMS,
      subject: `Turno ${ticketNumber} Llamado`,
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
