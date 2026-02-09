"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const appointment_entity_1 = require("./entities/appointment.entity");
const service_entity_1 = require("../services/entities/service.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let AppointmentsService = class AppointmentsService {
    constructor(appointmentRepository, serviceRepository, notificationsService) {
        this.appointmentRepository = appointmentRepository;
        this.serviceRepository = serviceRepository;
        this.notificationsService = notificationsService;
    }
    async create(patientId, createDto) {
        const service = await this.serviceRepository.findOne({
            where: { id: createDto.serviceId },
        });
        if (!service) {
            throw new common_1.NotFoundException('Servicio no encontrado');
        }
        if (!service.requiresAppointment) {
            throw new common_1.BadRequestException('Este servicio no requiere cita previa');
        }
        const scheduledDateTime = new Date(`${createDto.scheduledDate}T${createDto.scheduledTime}`);
        const isAvailable = await this.checkAvailability(createDto.serviceId, createDto.scheduledDate, createDto.scheduledTime);
        if (!isAvailable) {
            throw new common_1.BadRequestException('El horario seleccionado no está disponible');
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
        this.notificationsService.sendAppointmentConfirmation(patientId, saved.id, saved.scheduledDate, service.name).catch((error) => {
            console.error('Error sending appointment confirmation:', error);
        });
        return {
            ...saved,
            serviceName: service.name,
        };
    }
    async checkAvailability(serviceId, date, time) {
        const service = await this.serviceRepository.findOne({
            where: { id: serviceId },
        });
        if (!service) {
            throw new common_1.NotFoundException('Servicio no encontrado');
        }
        const startOfDay = new Date(`${date}T00:00:00`);
        const endOfDay = new Date(`${date}T23:59:59`);
        const appointments = await this.appointmentRepository.find({
            where: {
                serviceId,
                scheduledDate: (0, typeorm_2.Between)(startOfDay, endOfDay),
            },
        });
        const activeAppointments = appointments.filter((apt) => apt.status === 'scheduled' || apt.status === 'confirmed');
        if (time) {
            const requestedTime = new Date(`${date}T${time}`);
            const requestedEnd = new Date(requestedTime.getTime() + (service.estimatedTime || 30) * 60000);
            for (const apt of activeAppointments) {
                const aptStart = new Date(apt.scheduledDate);
                const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
                if ((requestedTime >= aptStart && requestedTime < aptEnd) ||
                    (requestedEnd > aptStart && requestedEnd <= aptEnd) ||
                    (requestedTime <= aptStart && requestedEnd >= aptEnd)) {
                    return false;
                }
            }
            return true;
        }
        return activeAppointments.length < 20;
    }
    async getAvailableSlots(serviceId, date) {
        const service = await this.serviceRepository.findOne({
            where: { id: serviceId },
        });
        if (!service) {
            throw new common_1.NotFoundException('Servicio no encontrado');
        }
        const slots = [];
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
    async findByPatient(patientId) {
        return this.appointmentRepository.find({
            where: { patientId },
            relations: ['service'],
            order: { scheduledDate: 'ASC' },
        });
    }
    async findOne(id, patientId) {
        const where = { id };
        if (patientId) {
            where.patientId = patientId;
        }
        return this.appointmentRepository.findOne({
            where,
            relations: ['service'],
        });
    }
    async update(id, updateDto, patientId) {
        const appointment = await this.findOne(id, patientId);
        if (!appointment) {
            throw new common_1.NotFoundException('Cita no encontrada');
        }
        if (updateDto.scheduledDate && updateDto.scheduledTime) {
            const newDateTime = new Date(`${updateDto.scheduledDate}T${updateDto.scheduledTime}`);
            const isAvailable = await this.checkAvailability(appointment.serviceId, updateDto.scheduledDate, updateDto.scheduledTime);
            if (!isAvailable) {
                throw new common_1.BadRequestException('El nuevo horario no está disponible');
            }
            appointment.scheduledDate = newDateTime;
            appointment.scheduledTime = updateDto.scheduledTime;
        }
        if (updateDto.status) {
            appointment.status = updateDto.status;
            if (updateDto.status === 'confirmed') {
                appointment.confirmedAt = new Date();
                const reminderDate = new Date(appointment.scheduledDate);
                reminderDate.setHours(reminderDate.getHours() - 24);
                if (reminderDate > new Date()) {
                    setTimeout(() => {
                        this.notificationsService.sendAppointmentReminder(appointment.patientId, appointment.id, appointment.scheduledDate, appointment.service?.name || 'Servicio').catch((error) => {
                            console.error('Error sending appointment reminder:', error);
                        });
                    }, reminderDate.getTime() - Date.now());
                }
            }
            else if (updateDto.status === 'completed') {
                appointment.completedAt = new Date();
                const { SurveysService } = await Promise.resolve().then(() => require('../surveys/surveys.service'));
            }
            else if (updateDto.status === 'cancelled') {
                appointment.cancelledAt = new Date();
            }
        }
        if (updateDto.notes !== undefined) {
            appointment.notes = updateDto.notes;
        }
        return this.appointmentRepository.save(appointment);
    }
    async cancel(id, patientId) {
        return this.update(id, { status: 'cancelled' }, patientId);
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __param(1, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map