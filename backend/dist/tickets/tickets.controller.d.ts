import { TicketsService } from './tickets.service';
import { CreateTicketDto, UpdateTicketDto, CallTicketDto, CheckInByCodeDto } from './dto/ticket.dto';
import { TicketStatus } from '../common/enums';
export declare class TicketsController {
    private readonly ticketsService;
    constructor(ticketsService: TicketsService);
    createKioskTicket(createDto: CreateTicketDto): Promise<{
        queue_position: number;
        ahead_count: number;
        id: number;
        ticket_number: string;
        service_id: number;
        service_name: string;
        status: TicketStatus;
        priority: import("../common/enums").Priority;
        created_at: Date;
        qr_code: string;
    }>;
    create(createDto: CreateTicketDto, req: any): Promise<{
        queue_position: number;
        ahead_count: number;
        id: number;
        ticket_number: string;
        service_id: number;
        service_name: string;
        status: TicketStatus;
        priority: import("../common/enums").Priority;
        created_at: Date;
        qr_code: string;
    }>;
    findAll(req: any, serviceId?: number, status?: TicketStatus): Promise<{
        queue_position: number;
        ahead_count: number;
        id: number;
        ticket_number: string;
        service_id: number;
        service_name: string;
        status: TicketStatus;
        priority: import("../common/enums").Priority;
        created_at: Date;
        qr_code: string;
    }[]>;
    checkInByCode(dto: CheckInByCodeDto): Promise<{
        status: TicketStatus.CHECK_IN;
        queue_position: number;
        ahead_count: number;
        message: string;
        type: string;
        ticket_number: string;
        service_id: number;
        preadmission_id?: undefined;
        paciente?: undefined;
        departamento?: undefined;
    } | {
        message: string;
        preadmission_id: number;
        paciente: string;
        departamento: string;
        type: string;
    }>;
    checkIn(id: number): Promise<{
        message: string;
        ticket_number: string;
    }>;
    call(id: number, callDto: CallTicketDto, req: any): Promise<{
        message: string;
        ticket_number: string;
    }>;
    start(id: number): Promise<{
        message: string;
    }>;
    complete(id: number): Promise<{
        message: string;
    }>;
    update(id: number, updateDto: UpdateTicketDto): Promise<{
        id: number;
        ticket_number: string;
        service_id: number;
        service_name: string;
        status: TicketStatus;
        priority: import("../common/enums").Priority;
        created_at: Date;
        qr_code: string;
    }>;
}
