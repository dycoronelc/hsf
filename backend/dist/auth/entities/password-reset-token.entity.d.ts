export declare class PasswordResetToken {
    id: number;
    userId: number;
    token: string;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}
