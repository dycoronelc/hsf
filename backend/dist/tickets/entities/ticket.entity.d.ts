import { User } from '../../users/entities/user.entity';
import { Service } from '../../services/entities/service.entity';
import { TicketStatus, Priority } from '../../common/enums';
export declare class Ticket {
    id: number;
    ticketNumber: string;
    patientId: number;
    patient: User;
    serviceId: number;
    service: Service;
    status: TicketStatus;
    priority: Priority;
    createdAt: Date;
    checkInAt: Date;
    calledAt: Date;
    startedAt: Date;
    completedAt: Date;
    windowNumber: string;
    calledBy: number;
    notes: string;
    qrCode: string;
}
