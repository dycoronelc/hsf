import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
export declare class AuditService {
    private readonly auditRepository;
    constructor(auditRepository: Repository<AuditLog>);
    log(action: string, opts?: {
        entityType?: string;
        entityId?: number;
        userId?: number;
        details?: string;
    }): Promise<void>;
}
