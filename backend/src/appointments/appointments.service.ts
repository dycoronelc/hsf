import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Service } from '../services/entities/service.entity';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async create(patientId: number, createDto: CreateAppointmentDto) {
    const service = await this.serviceRepository.findOne({
      where: { id: createDto.serviceId },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (!service.requiresAppointment) {
      throw new BadRequestException('Este servicio no requiere cita previa');
    }

    // Verificar disponibilidad
    const scheduledDateTime = new Date(`${createDto.scheduledDate}T${createDto.scheduledTime}`);
    const isAvailable = await this.checkAvailability(
      createDto.serviceId,
      createDto.scheduledDate,
      createDto.scheduledTime,
    );

    if (!isAvailable) {
      throw new BadRequestException('El horario seleccionado no está disponible');
    }

    const appointment = this.appointmentRepository.create({
      patientId,
      serviceId: createDto.serviceId,
      scheduledDate: scheduledDateTime,
      scheduledTime: createDto.scheduledTime,
      duration: service.estimatedTime || 30,
      status: 'scheduled',
      notes: createDto.notes,
    });

    const saved = await this.appointmentRepository.save(appointment);
    
    // Enviar notificación de confirmación
    this.notificationsService.sendAppointmentConfirmation(
      patientId,
      saved.id,
      saved.scheduledDate,
      service.name,
    ).catch((error) => {
      console.error('Error sending appointment confirmation:', error);
    });

    return {
      ...saved,
      serviceName: service.name,
    };
  }

  async checkAvailability(serviceId: number, date: string, time?: string): Promise<boolean> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    // Obtener todas las citas del día
    const appointments = await this.appointmentRepository.find({
      where: {
        serviceId,
        scheduledDate: Between(startOfDay, endOfDay),
      },
    });
    
    // Filtrar solo citas activas (scheduled o confirmed)
    const activeAppointments = appointments.filter(
      (apt) => apt.status === 'scheduled' || apt.status === 'confirmed',
    );

    // Si se especifica un tiempo, verificar si está disponible
    if (time) {
      const requestedTime = new Date(`${date}T${time}`);
      const requestedEnd = new Date(requestedTime.getTime() + (service.estimatedTime || 30) * 60000);

      for (const apt of activeAppointments) {
        const aptStart = new Date(apt.scheduledDate);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);

        // Verificar solapamiento
        if (
          (requestedTime >= aptStart && requestedTime < aptEnd) ||
          (requestedEnd > aptStart && requestedEnd <= aptEnd) ||
          (requestedTime <= aptStart && requestedEnd >= aptEnd)
        ) {
          return false;
        }
      }
      return true;
    }

    // Si no se especifica tiempo, retornar slots disponibles
    return activeAppointments.length < 20; // Máximo 20 citas por día (configurable)
  }

  async getAvailableSlots(serviceId: number, date: string): Promise<string[]> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    // Horario de trabajo: 8:00 AM - 5:00 PM (configurable)
    const slots: string[] = [];
    const startHour = 8;
    const endHour = 17;
    const slotDuration = service.estimatedTime || 30;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isAvailable = await this.checkAvailability(serviceId, date, time);
        if (isAvailable) {
          slots.push(time);
        }
      }
    }

    return slots;
  }

  async findByPatient(patientId: number) {
    return this.appointmentRepository.find({
      where: { patientId },
      relations: ['service'],
      order: { scheduledDate: 'ASC' },
    });
  }

  async findOne(id: number, patientId?: number) {
    const where: any = { id };
    if (patientId) {
      where.patientId = patientId;
    }
    return this.appointmentRepository.findOne({
      where,
      relations: ['service'],
    });
  }

  async update(id: number, updateDto: UpdateAppointmentDto, patientId?: number) {
    const appointment = await this.findOne(id, patientId);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (updateDto.scheduledDate && updateDto.scheduledTime) {
      const newDateTime = new Date(`${updateDto.scheduledDate}T${updateDto.scheduledTime}`);
      const isAvailable = await this.checkAvailability(
        appointment.serviceId,
        updateDto.scheduledDate,
        updateDto.scheduledTime,
      );
      if (!isAvailable) {
        throw new BadRequestException('El nuevo horario no está disponible');
      }
      appointment.scheduledDate = newDateTime;
      appointment.scheduledTime = updateDto.scheduledTime;
    }

    if (updateDto.status) {
      appointment.status = updateDto.status;
      if (updateDto.status === 'confirmed') {
        appointment.confirmedAt = new Date();
        // Enviar recordatorio 24 horas antes
        const reminderDate = new Date(appointment.scheduledDate);
        reminderDate.setHours(reminderDate.getHours() - 24);
        if (reminderDate > new Date()) {
          setTimeout(() => {
            this.notificationsService.sendAppointmentReminder(
              appointment.patientId,
              appointment.id,
              appointment.scheduledDate,
              appointment.service?.name || 'Servicio',
            ).catch((error) => {
              console.error('Error sending appointment reminder:', error);
            });
          }, reminderDate.getTime() - Date.now());
        }
      } else if (updateDto.status === 'completed') {
        appointment.completedAt = new Date();
        // Crear encuesta automática
        const { SurveysService } = await import('../surveys/surveys.service');
        // Esto se manejará mejor con inyección de dependencias
      } else if (updateDto.status === 'cancelled') {
        appointment.cancelledAt = new Date();
      }
    }

    if (updateDto.notes !== undefined) {
      appointment.notes = updateDto.notes;
    }

    return this.appointmentRepository.save(appointment);
  }

  async cancel(id: number, patientId?: number) {
    return this.update(id, { status: 'cancelled' as any }, patientId);
  }
}

