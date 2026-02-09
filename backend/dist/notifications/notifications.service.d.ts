import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/notification.dto';
export declare class NotificationsService {
    private notificationRepository;
    private userRepository;
    private readonly logger;
    private emailTransporter;
    constructor(notificationRepository: Repository<Notification>, userRepository: Repository<User>);
    create(createDto: CreateNotificationDto): Promise<Notification>;
    private sendNotification;
    private sendEmail;
    private sendSMS;
    private sendWhatsApp;
    sendAppointmentConfirmation(userId: number, appointmentId: number, appointmentDate: Date, serviceName: string): Promise<void>;
    sendAppointmentReminder(userId: number, appointmentId: number, appointmentDate: Date, serviceName: string): Promise<void>;
    sendTicketCreated(userId: number, ticketNumber: string, serviceName: string, qrCode?: string): Promise<void>;
    sendTicketCalled(userId: number, ticketNumber: string, windowNumber: string): Promise<void>;
    findAll(userId?: number): Promise<Notification[]>;
}
