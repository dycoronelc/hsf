import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/notification.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    smtpConnectivity(): Promise<{
        config: {
            deliveryEnabled: boolean;
            configured: boolean;
            host: string;
            port: number;
            user: string;
            from: string;
        };
        deliveryEnabled: boolean;
        configured: boolean;
        ok: boolean;
        message: string;
    }>;
    create(createDto: CreateNotificationDto): Promise<import("./entities/notification.entity").Notification>;
    findAll(req: any): Promise<import("./entities/notification.entity").Notification[]>;
}
