import { TicketStatus, Priority } from '../../common/enums';
export declare class CreateTicketDto {
    serviceId: number;
    priority?: Priority;
}
export declare class UpdateTicketDto {
    status?: TicketStatus;
    windowNumber?: string;
    notes?: string;
}
export declare class CallTicketDto {
    windowNumber: string;
}
export declare class CheckInByCodeDto {
    code: string;
}
