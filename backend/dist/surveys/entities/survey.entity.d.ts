import { Ticket } from '../../tickets/entities/ticket.entity';
export declare class Survey {
    id: number;
    ticketId: number;
    ticket: Ticket;
    patientId: number;
    npsScore: number;
    csatScore: number;
    comments: string;
    isCompleted: boolean;
    sentAt: Date;
    submittedAt: Date;
}
