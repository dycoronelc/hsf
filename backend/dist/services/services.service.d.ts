import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
export declare class ServicesService {
    private serviceRepository;
    constructor(serviceRepository: Repository<Service>);
    findAll(area?: string): Promise<Service[]>;
    findOne(id: number): Promise<Service>;
}
