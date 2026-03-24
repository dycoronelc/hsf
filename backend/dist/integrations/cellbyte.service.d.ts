import { Repository } from 'typeorm';
import { IntegrationLog } from './entities/integration-log.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
export declare class CellbyteService {
    private logRepository;
    private readonly logger;
    constructor(logRepository: Repository<IntegrationLog>);
    buildPayload(p: Preadmission): Record<string, unknown>;
    sendPreadmission(preadmission: Preadmission, attempt?: number): Promise<void>;
}
