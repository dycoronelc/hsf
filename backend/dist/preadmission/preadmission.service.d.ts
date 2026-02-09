import { Repository } from 'typeorm';
import { Preadmission } from './entities/preadmission.entity';
import { CreatePreadmissionDto, ReviewPreadmissionDto } from './dto/preadmission.dto';
import { PreadmissionStatus } from '../common/enums';
import { User } from '../users/entities/user.entity';
export declare class PreadmissionService {
    private preadmissionRepository;
    constructor(preadmissionRepository: Repository<Preadmission>);
    private generateQrCode;
    create(createDto: CreatePreadmissionDto, patientId: number): Promise<Preadmission>;
    findAll(user: User, skip?: number, limit?: number): Promise<Preadmission[]>;
    findOne(id: number, user: User): Promise<Preadmission>;
    findByCedula(cedula: string, tipoIdentificacion: string): Promise<Preadmission | null>;
    review(id: number, reviewDto: ReviewPreadmissionDto, reviewerId: number): Promise<{
        message: string;
        status: PreadmissionStatus;
    }>;
}
