import { Service } from '../../services/entities/service.entity';
import { User } from '../../users/entities/user.entity';
export declare class Appointment {
    id: number;
    patientId: number;
    patient: User;
    serviceId: number;
    service: Service;
    scheduledDate: Date;
    scheduledTime: string;
    duration: number;
    status: string;
    notes: string;
    confirmedAt: Date;
    completedAt: Date;
    cancelledAt: Date;
    createdAt: Date;
}
