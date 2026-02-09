import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    createService(name: string, code: string, area: string, estimatedTime?: number): Promise<{
        message: string;
        id: number;
    }>;
}
