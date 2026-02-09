import { Repository } from 'typeorm';
import { Service } from '../services/entities/service.entity';
export declare class AdminService {
    private serviceRepository;
    constructor(serviceRepository: Repository<Service>);
    createService(name: string, code: string, area: string, estimatedTime?: number): Promise<Service>;
}
