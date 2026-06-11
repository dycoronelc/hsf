import { Repository } from 'typeorm';
import { IntegrationLog } from './entities/integration-log.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
export type CellbyteSendResult = {
    success: boolean;
    skipped: boolean;
    errorMessage?: string | null;
};
export type CellbyteConnectivityResult = {
    configured: boolean;
    baseUrl: string | null;
    reachable: boolean;
    authOk: boolean;
    credentialsConfigured: boolean;
    message: string;
    checkedAt: string;
    httpStatus?: number;
};
export declare class CellbyteService {
    private logRepository;
    private readonly logger;
    constructor(logRepository: Repository<IntegrationLog>);
    buildPayload(p: Preadmission): Record<string, string>;
    checkConnectivity(): Promise<CellbyteConnectivityResult>;
    sendPreadmission(preadmission: Preadmission, attempt?: number): Promise<CellbyteSendResult>;
    isConfigured(): boolean;
    private fetchAuthToken;
    private parseToken;
    private extractErrorMessage;
    private unreachableMessage;
    private fetchWithTimeout;
    private writeLog;
}
