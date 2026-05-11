export declare class VerificationCode {
    id: number;
    channel: string;
    destination: string;
    code: string;
    expiresAt: Date;
    verified: boolean;
    createdAt: Date;
}
