import { ServicesService } from './services.service';
export declare class ServicesController {
    private readonly servicesService;
    constructor(servicesService: ServicesService);
    findAll(area?: string): Promise<import("./entities/service.entity").Service[]>;
    findOne(id: number): Promise<import("./entities/service.entity").Service>;
}
