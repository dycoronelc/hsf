import { Ticket } from '../../tickets/entities/ticket.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
export declare class Survey {
    id: number;
    ticketId: number;
    ticket: Ticket;
    appointmentId: number;
    appointment: Appointment;
    patientId: number;
    npsScore: number;
    csatScore: number;
    comments: string;
    isCompleted: boolean;
    sentAt: Date;
    submittedAt: Date;
}
