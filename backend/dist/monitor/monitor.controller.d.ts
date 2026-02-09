import { MonitorService } from './monitor.service';
export declare class MonitorController {
    private readonly monitorService;
    constructor(monitorService: MonitorService);
    getQueue(serviceId: number): Promise<{
        service_id: number;
        service_name: string;
        current: {
            ticket_number: string;
            service_name: string;
            priority: import("../common/enums").Priority;
            wait_time: number;
            status: import("../common/enums").TicketStatus;
        };
        queue: {
            ticket_number: string;
            service_name: string;
            priority: import("../common/enums").Priority;
            wait_time: number;
            status: import("../common/enums").TicketStatus;
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
            status: import("../common/enums").TicketStatus;
        };
        queue: {
            ticket_number: string;
            service_name: string;
            priority: import("../common/enums").Priority;
            wait_time: number;
            status: import("../common/enums").TicketStatus;
        }[];
        next_numbers: string[];
    }[]>;
    getPreadmissions(): Promise<{
        departamento: string;
        label: string;
        items: import("./monitor.service").PreadmissionMonitorItem[];
    }[]>;
}
