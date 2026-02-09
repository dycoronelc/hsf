import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { TicketStatus } from '../common/enums';
export declare class MonitorService {
    private ticketRepository;
    private serviceRepository;
    private preadmissionRepository;
    constructor(ticketRepository: Repository<Ticket>, serviceRepository: Repository<Service>, preadmissionRepository: Repository<Preadmission>);
    getQueue(serviceId: number): Promise<{
        service_id: number;
        service_name: string;
        current: {
            ticket_number: string;
            service_name: string;
            priority: import("../common/enums").Priority;
            wait_time: number;
            status: TicketStatus;
        };
        queue: {
            ticket_number: string;
            service_name: string;
            priority: import("../common/enums").Priority;
            wait_time: number;
            status: TicketStatus;
        }[];
        next_numbers: string[];
    }>;
    getAllQueues(): Promise<{
        service_id: number;
        service_name: string;
        current: {
            ticket_number: string;
            service_name: string;
            priority: import("../common/enums").Priority;
            wait_time: number;
            status: TicketStatus;
        };
        queue: {
            ticket_number: string;
            service_name: string;
            priority: import("../common/enums").Priority;
            wait_time: number;
            status: TicketStatus;
        }[];
        next_numbers: string[];
    }[]>;
    getPreadmissionsForMonitor(): Promise<{
        departamento: string;
        label: string;
        items: PreadmissionMonitorItem[];
    }[]>;
}
export interface PreadmissionMonitorItem {
    id: number;
    cedula: string;
    nombre: string;
    status: string;
    fechapreadmision: Date;
}
