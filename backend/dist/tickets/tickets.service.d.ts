import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { CreateTicketDto, UpdateTicketDto, TransferTicketDto } from './dto/ticket.dto';
import { TicketStatus, Priority } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SurveysService } from '../surveys/surveys.service';
import { AuditService } from '../audit/audit.service';
export declare class TicketsService {
    private ticketRepository;
    private serviceRepository;
    private preadmissionRepository;
    private notificationsService;
    private surveysService;
    private auditService;
    constructor(ticketRepository: Repository<Ticket>, serviceRepository: Repository<Service>, preadmissionRepository: Repository<Preadmission>, notificationsService: NotificationsService, surveysService: SurveysService, auditService: AuditService);
    private generateTicketNumber;
    private assertAgentCanOperate;
    private generateQrCode;
    private getActiveQueueStatuses;
    private getQueuePositionsByService;
    private enrichWithQueueInfo;
    createKioskTicket(createDto: CreateTicketDto): Promise<{
        queue_position: number;
        ahead_count: number;
        estimated_wait_seconds: number;
        estimated_wait_label: string;
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
        estimated_wait_seconds: number;
        estimated_wait_label: string;
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
        estimated_wait_seconds: number;
        estimated_wait_label: string;
        id: number;
        ticket_number: string;
        service_id: number;
        service_name: string;
        status: TicketStatus;
        priority: Priority;
        priority_level: number;
        created_at: Date;
        qr_code: string;
        window_number: string;
    }[]>;
    checkIn(id: number): Promise<{
        message: string;
        ticket_number: string;
    }>;
    checkInByCode(code: string): Promise<{
        status: TicketStatus.CHECK_IN;
        queue_position: number;
        ahead_count: number;
        estimated_wait_seconds: number;
        estimated_wait_label: string;
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
    call(id: number, windowNumber: string, agent: Pick<User, 'id' | 'agentState'>): Promise<{
        message: string;
        ticket_number: string;
    }>;
    start(id: number, agent?: Pick<User, 'id' | 'agentState'>): Promise<{
        message: string;
    }>;
    complete(id: number, agent?: Pick<User, 'id' | 'agentState'>): Promise<{
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
    transfer(id: number, dto: TransferTicketDto, agent?: Pick<User, 'id' | 'agentState'>): Promise<{
        message: string;
        originalId: number;
        newTicketId: number;
        service_id?: undefined;
        service_name?: undefined;
    } | {
        message: string;
        service_id: number;
        service_name: string;
        originalId?: undefined;
        newTicketId?: undefined;
    }>;
    createTicketForPreadmission(preadmissionId: number): Promise<{
        queue_position: number;
        ahead_count: number;
        estimated_wait_seconds: number;
        estimated_wait_label: string;
        id: number;
        ticket_number: string;
        service_id: number;
        service_name: string;
        status: TicketStatus;
        priority: Priority;
        created_at: Date;
        qr_code: string;
        preadmission_id: number;
    }>;
}
