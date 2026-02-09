export declare enum AppointmentStatus {
    SCHEDULED = "scheduled",
    CONFIRMED = "confirmed",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare class CreateAppointmentDto {
    serviceId: number;
    scheduledDate: string;
    scheduledTime: string;
    notes?: string;
}
export declare class CheckAvailabilityDto {
    serviceId: number;
    date: string;
}
export declare class UpdateAppointmentDto {
    scheduledDate?: string;
    scheduledTime?: string;
    status?: AppointmentStatus;
    notes?: string;
}
