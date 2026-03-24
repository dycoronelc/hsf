import { PreadmissionService } from './preadmission.service';
import { CreatePreadmissionDto, ReviewPreadmissionDto, ParseCedulaQrDto } from './dto/preadmission.dto';
import { PreadmissionArrivalState } from '../common/enums';
export declare class PreadmissionController {
    private readonly preadmissionService;
    constructor(preadmissionService: PreadmissionService);
    searchByCedula(cedula: string, tipoIdentificacion: string): Promise<import("./entities/preadmission.entity").Preadmission>;
    createPublic(createDto: CreatePreadmissionDto): Promise<import("./entities/preadmission.entity").Preadmission>;
    parseCedulaQr(body: ParseCedulaQrDto): Promise<Record<string, string>>;
    create(createDto: CreatePreadmissionDto, req: any): Promise<import("./entities/preadmission.entity").Preadmission>;
    workList(req: any, arrivalState?: PreadmissionArrivalState, q?: string, skip?: number, limit?: number): Promise<import("./entities/preadmission.entity").Preadmission[]>;
    findAll(req: any, skip?: number, limit?: number): Promise<import("./entities/preadmission.entity").Preadmission[]>;
    confirmArrival(id: number, req: any): Promise<import("./entities/preadmission.entity").Preadmission>;
    activateTicket(id: number, req: any): Promise<unknown>;
    findOne(id: number, req: any): Promise<import("./entities/preadmission.entity").Preadmission>;
    review(id: number, reviewDto: ReviewPreadmissionDto, req: any): Promise<{
        message: string;
        status: import("../common/enums").PreadmissionStatus;
    }>;
}
