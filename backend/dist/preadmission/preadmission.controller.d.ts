import { PreadmissionService } from './preadmission.service';
import { CreatePreadmissionDto, ReviewPreadmissionDto } from './dto/preadmission.dto';
export declare class PreadmissionController {
    private readonly preadmissionService;
    constructor(preadmissionService: PreadmissionService);
    searchByCedula(cedula: string, tipoIdentificacion: string): Promise<import("./entities/preadmission.entity").Preadmission>;
    create(createDto: CreatePreadmissionDto, req: any): Promise<import("./entities/preadmission.entity").Preadmission>;
    findAll(req: any, skip?: number, limit?: number): Promise<import("./entities/preadmission.entity").Preadmission[]>;
    findOne(id: number, req: any): Promise<import("./entities/preadmission.entity").Preadmission>;
    review(id: number, reviewDto: ReviewPreadmissionDto, req: any): Promise<{
        message: string;
        status: import("../common/enums").PreadmissionStatus;
    }>;
}
