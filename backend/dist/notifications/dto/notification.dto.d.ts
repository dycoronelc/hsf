import { NotificationType } from '../entities/notification.entity';
export declare class CreateNotificationDto {
    recipientId: number;
    type: NotificationType;
    subject: string;
    content: string;
    relatedEntityType?: string;
    relatedEntityId?: number;
}
