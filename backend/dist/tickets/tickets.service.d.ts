import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { CreateTicketDto, UpdateTicketDto } from './dto/ticket.dto';
import { TicketStatus, Priority } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SurveysService } from '../surveys/surveys.service';
export declare class TicketsService {
    private ticketRepository;
    private serviceRepository;
    private preadmissionRepository;
    private notificationsService;
    private surveysService;
    constructor(ticketRepository: Repository<Ticket>, serviceRepository: Repository<Service>, preadmissionRepository: Repository<Preadmission>, notificationsService: NotificationsService, surveysService: SurveysService);
    private generateTicketNumber;
    private generateQrCode;
    private getActiveQueueStatuses;
    private getQueuePositionsByService;
    private enrichWithQueueInfo;
    createKioskTicket(createDto: CreateTicketDto): Promise<{
        queue_position: number;
        ahead_count: number;
        id: number;
        ticket_number: string;
        service_id: number;
        service_name: string;
        status: TicketStatus;
        priority: Priority;
        created_at: Date;
        qr_code: string;
    }>;
    create(createDto: CreateTicketDto, patientId: number): Promise<{
        queue_position: number;
        ahead_count: number;
        id: number;
        ticket_number: string;
        service_id: number;
        service_name: string;
        status: TicketStatus;
        priority: Priority;
        created_at: Date;
        qr_code: string;
    }>;
    findAll(user: User, serviceId?: number, status?: TicketStatus): Promise<{
        queue_position: number;
        ahead_count: number;
        id: number;
        ticket_number: string;
        service_id: number;
        service_name: string;
        status: TicketStatus;
        priority: Priority;
        created_at: Date;
        qr_code: string;
    }[]>;
    checkIn(id: number): Promise<{
        message: string;
        ticket_number: string;
    }>;
    checkInByCode(code: string): Promise<{
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
    call(id: number, windowNumber: string, calledBy: number): Promise<{
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
        priority: Priority;
        created_at: Date;
        qr_code: string;
    }>;
}
