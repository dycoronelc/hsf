export declare class IntegrationLog {
    id: number;
    integration: string;
    preadmissionId: number | null;
    requestPayload: string | null;
    responseBody: string | null;
    success: boolean;
    attempt: number;
    errorMessage: string | null;
    createdAt: Date;
}
