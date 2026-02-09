import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/notification.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    create(createDto: CreateNotificationDto): Promise<import("./entities/notification.entity").Notification>;
    findAll(req: any): Promise<import("./entities/notification.entity").Notification[]>;
}
