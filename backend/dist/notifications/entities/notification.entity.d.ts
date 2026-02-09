import { User } from '../../users/entities/user.entity';
export declare enum NotificationType {
    EMAIL = "email",
    SMS = "sms",
    WHATSAPP = "whatsapp",
    PUSH = "push"
}
export declare enum NotificationStatus {
    PENDING = "pending",
    SENT = "sent",
    FAILED = "failed"
}
export declare class Notification {
    id: number;
    recipientId: number;
    recipient: User;
    type: NotificationType;
    subject: string;
    content: string;
    status: NotificationStatus;
    sentAt: Date;
    errorMessage: string;
    relatedEntityType: string;
    relatedEntityId: number;
    createdAt: Date;
}
