export declare class AuditLog {
    id: number;
    action: string;
    entityType: string | null;
    entityId: number | null;
    userId: number | null;
    details: string | null;
    createdAt: Date;
}
