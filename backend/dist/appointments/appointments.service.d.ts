import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Service } from '../services/entities/service.entity';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AppointmentsService {
    private appointmentRepository;
    private serviceRepository;
    private notificationsService;
    constructor(appointmentRepository: Repository<Appointment>, serviceRepository: Repository<Service>, notificationsService: NotificationsService);
    create(patientId: number, createDto: CreateAppointmentDto): Promise<{
        serviceName: string;
        id: number;
        patientId: number;
        patient: import("../users/entities/user.entity").User;
        serviceId: number;
        service: Service;
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
    checkAvailability(serviceId: number, date: string, time?: string): Promise<boolean>;
    getAvailableSlots(serviceId: number, date: string): Promise<string[]>;
    findByPatient(patientId: number): Promise<Appointment[]>;
    findOne(id: number, patientId?: number): Promise<Appointment>;
    update(id: number, updateDto: UpdateAppointmentDto, patientId?: number): Promise<Appointment>;
    cancel(id: number, patientId?: number): Promise<Appointment>;
}
