export declare function isSmtpDeliveryEnabled(): boolean;
export declare function getSmtpHost(): string;
export declare function getSmtpPort(): number;
export declare function getSmtpUser(): string;
export declare function getSmtpPass(): string;
export declare function getSmtpFrom(): string;
export declare function isSmtpConfigured(): boolean;
export declare function getSmtpConfigSummary(): {
    deliveryEnabled: boolean;
    configured: boolean;
    host: string;
    port: number;
    user: string;
    from: string;
};
export declare function assertSmtpReadyForSend(): void;
export declare function formatSmtpError(err: unknown): string;
