import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, CheckAvailabilityDto, UpdateAppointmentDto } from './dto/appointment.dto';
export declare class AppointmentsController {
    private readonly appointmentsService;
    constructor(appointmentsService: AppointmentsService);
    checkAvailability(checkDto: CheckAvailabilityDto): Promise<{
        available: boolean;
    }>;
    getAvailableSlots(serviceId: number, date: string): Promise<{
        slots: string[];
    }>;
    create(createDto: CreateAppointmentDto, req: any): Promise<{
        serviceName: string;
        id: number;
        patientId: number;
        patient: import("../users/entities/user.entity").User;
        serviceId: number;
        service: import("../services/entities/service.entity").Service;
        scheduledDate: Date;
        scheduledTime: string;
        duration: number;
        status: string;
        notes: string;
        confirmedAt: Date;
        completedAt: Date;
        cancelledAt: Date;
        createdAt: Date;
    }>;
    findAll(req: any): Promise<import("./entities/appointment.entity").Appointment[]>;
    findOne(id: number, req: any): Promise<import("./entities/appointment.entity").Appointment>;
    update(id: number, updateDto: UpdateAppointmentDto, req: any): Promise<import("./entities/appointment.entity").Appointment>;
    cancel(id: number, req: any): Promise<import("./entities/appointment.entity").Appointment>;
}
