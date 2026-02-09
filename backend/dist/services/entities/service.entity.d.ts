import { Sede } from './sede.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
export declare class Service {
    id: number;
    name: string;
    code: string;
    area: string;
    sedeId: number;
    sede: Sede;
    isActive: boolean;
    estimatedTime: number;
    requiresAppointment: boolean;
    tickets: Ticket[];
}
