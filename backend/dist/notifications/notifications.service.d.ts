import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/notification.dto';
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
export declare class NotificationsService {
    private notificationRepository;
    private userRepository;
    private readonly logger;
    private emailTransporter;
    constructor(notificationRepository: Repository<Notification>, userRepository: Repository<User>);
    checkSmtpConnectivity(): Promise<{
        deliveryEnabled: boolean;
        configured: boolean;
        ok: boolean;
        message: string;
    }>;
    create(createDto: CreateNotificationDto): Promise<Notification>;
    private sendNotification;
    private sendEmail;
    sendEmailVerificationCode(to: string, code: string): Promise<void>;
    sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
    sendTicketCreated(userId: number, ticketNumber: string, serviceName: string, qrCode?: string): Promise<void>;
    sendPreadmissionConfirmation(data: PreadmissionConfirmationPayload): Promise<void>;
    sendTicketCalled(userId: number, ticketNumber: string, windowNumber: string): Promise<void>;
    findAll(userId?: number): Promise<Notification[]>;
}
