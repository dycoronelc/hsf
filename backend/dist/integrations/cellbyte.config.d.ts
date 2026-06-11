export type CellbyteConfig = {
    baseUrl: string;
    username: string;
    password: string;
    authUrl: string;
    preAdmissionUrl: string;
};
export declare function getCellbyteConfig(): CellbyteConfig | null;
export declare function isCellbyteConfigured(): boolean;
