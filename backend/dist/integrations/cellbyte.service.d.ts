import { Repository } from 'typeorm';
import { IntegrationLog } from './entities/integration-log.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { PreadmissionStorageService } from '../preadmission/preadmission-storage.service';
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
export type CellbytePostmanExport = {
    preadmissionId: number;
    generatedAt: string;
    cellbyte: {
        baseUrl: string | null;
        authUrl: string | null;
        preAdmissionUrl: string | null;
    };
    payload: Record<string, string>;
    postmanBody: {
        json: string;
    };
    cedula: string;
    pasaporte: string;
    warnings: string[];
    attachmentSizes: {
        cedulaimagen: number;
        ordenimagen: number;
        ssimagen: number;
    };
    usage: {
        step1: string;
        step2: string;
    };
};
export declare class CellbyteService {
    private logRepository;
    private readonly storageService;
    private readonly logger;
    constructor(logRepository: Repository<IntegrationLog>, storageService: PreadmissionStorageService);
    private readAttachments;
    buildPayload(p: Preadmission): Record<string, string>;
    getPostmanExport(preadmission: Preadmission): CellbytePostmanExport;
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
