import { Repository } from 'typeorm';
import { Preadmission } from './entities/preadmission.entity';
import { CreatePreadmissionDto, ReviewPreadmissionDto } from './dto/preadmission.dto';
import { PreadmissionStatus, PreadmissionArrivalState } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { CellbyteService } from '../integrations/cellbyte.service';
import { TicketsService } from '../tickets/tickets.service';
import { AuditService } from '../audit/audit.service';
import { VerificationCode } from '../auth/entities/verification-code.entity';
export declare class PreadmissionService {
    private preadmissionRepository;
    private verificationRepository;
    private readonly cellbyteService;
    private readonly ticketsService;
    private readonly auditService;
    constructor(preadmissionRepository: Repository<Preadmission>, verificationRepository: Repository<VerificationCode>, cellbyteService: CellbyteService, ticketsService: TicketsService, auditService: AuditService);
    private generateQrCode;
    parseCedulaQrPayload(raw: string): Record<string, string>;
    private assertNamesAndAddress;
    private formatCelular;
    create(createDto: CreatePreadmissionDto, patientId: number | null): Promise<Preadmission>;
    findAll(user: User, skip?: number, limit?: number): Promise<Preadmission[]>;
    findWorkList(user: User, opts: {
        arrivalState?: PreadmissionArrivalState;
        q?: string;
        skip?: number;
        limit?: number;
    }): Promise<Preadmission[]>;
    confirmArrival(id: number, user: User): Promise<Preadmission>;
    activateTicket(id: number, user: User): Promise<unknown>;
    findOne(id: number, user: User): Promise<Preadmission>;
    findByCedula(cedula: string, tipoIdentificacion: string): Promise<Preadmission | null>;
    review(id: number, reviewDto: ReviewPreadmissionDto, reviewerId: number): Promise<{
        message: string;
        status: PreadmissionStatus;
    }>;
    private generateVerificationCode;
    requestContactVerification(channel: 'email' | 'sms', destination: string): Promise<{
        message: string;
        channel: "email" | "sms";
        destination: string;
        expiresAt: Date;
        previewCode: string;
    }>;
    confirmContactVerification(channel: 'email' | 'sms', destination: string, code: string): Promise<{
        message: string;
        channel: "email" | "sms";
        destination: string;
    }>;
}
