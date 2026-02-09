import { Service } from './service.entity';
export declare class Sede {
    id: number;
    name: string;
    address: string;
    isActive: boolean;
    services: Service[];
}
