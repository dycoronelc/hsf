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
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ticket_entity_1 = require("./entities/ticket.entity");
const service_entity_1 = require("../services/entities/service.entity");
const preadmission_entity_1 = require("../preadmission/entities/preadmission.entity");
const enums_1 = require("../common/enums");
const crypto = require("crypto");
const notifications_service_1 = require("../notifications/notifications.service");
const surveys_service_1 = require("../surveys/surveys.service");
let TicketsService = class TicketsService {
    constructor(ticketRepository, serviceRepository, preadmissionRepository, notificationsService, surveysService) {
        this.ticketRepository = ticketRepository;
        this.serviceRepository = serviceRepository;
        this.preadmissionRepository = preadmissionRepository;
        this.notificationsService = notificationsService;
        this.surveysService = surveysService;
    }
    generateTicketNumber(serviceCode) {
        const randomSuffix = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
        return `${serviceCode}-${randomSuffix}`;
    }
    generateQrCode() {
        return crypto.randomBytes(8).toString('hex').toUpperCase();
    }
    getActiveQueueStatuses() {
        return [enums_1.TicketStatus.CREADO];
    }
    async getQueuePositionsByService(serviceId) {
        const activeTickets = await this.ticketRepository.find({
            where: { serviceId, status: (0, typeorm_2.In)(this.getActiveQueueStatuses()) },
            order: { createdAt: 'ASC' },
        });
        const map = new Map();
        activeTickets.forEach((t, idx) => map.set(t.id, idx + 1));
        return map;
    }
    async enrichWithQueueInfo(tickets) {
        const serviceIds = Array.from(new Set(tickets.map((t) => t.serviceId)));
        const serviceMaps = await Promise.all(serviceIds.map(async (sid) => [sid, await this.getQueuePositionsByService(sid)]));
        const byService = new Map(serviceMaps);
        const out = new Map();
        for (const t of tickets) {
            const pos = byService.get(t.serviceId)?.get(t.id) ?? 0;
            out.set(t.id, { queue_position: pos, ahead_count: Math.max(0, pos - 1) });
        }
        return out;
    }
    async createKioskTicket(createDto) {
        const service = await this.serviceRepository.findOne({
            where: { id: createDto.serviceId },
        });
        if (!service) {
            throw new common_1.NotFoundException('Servicio no encontrado');
        }
        const ticket = this.ticketRepository.create({
            ticketNumber: this.generateTicketNumber(service.code),
            patientId: null,
            serviceId: createDto.serviceId,
            priority: createDto.priority || enums_1.Priority.NORMAL,
            status: enums_1.TicketStatus.CREADO,
            qrCode: this.generateQrCode(),
        });
        const savedTicket = await this.ticketRepository.save(ticket);
        const queueInfo = await this.enrichWithQueueInfo([{ id: savedTicket.id, serviceId: savedTicket.serviceId }]);
        const qi = queueInfo.get(savedTicket.id) ?? { queue_position: 0, ahead_count: 0 };
        return {
            id: savedTicket.id,
            ticket_number: savedTicket.ticketNumber,
            service_id: savedTicket.serviceId,
            service_name: service.name,
            status: savedTicket.status,
            priority: savedTicket.priority,
            created_at: savedTicket.createdAt,
            qr_code: savedTicket.qrCode,
            ...qi,
        };
    }
    async create(createDto, patientId) {
        const service = await this.serviceRepository.findOne({
            where: { id: createDto.serviceId },
        });
        if (!service) {
            throw new common_1.NotFoundException('Servicio no encontrado');
        }
        const ticket = this.ticketRepository.create({
            ticketNumber: this.generateTicketNumber(service.code),
            patientId,
            serviceId: createDto.serviceId,
            priority: createDto.priority || enums_1.Priority.NORMAL,
            status: enums_1.TicketStatus.CREADO,
            qrCode: this.generateQrCode(),
        });
        const savedTicket = await this.ticketRepository.save(ticket);
        if (patientId && patientId > 0) {
            this.notificationsService.sendTicketCreated(patientId, savedTicket.ticketNumber, service.name, savedTicket.qrCode).catch((error) => {
                console.error('Error sending ticket notification:', error);
            });
        }
        const queueInfo = await this.enrichWithQueueInfo([{ id: savedTicket.id, serviceId: savedTicket.serviceId }]);
        const qi = queueInfo.get(savedTicket.id) ?? { queue_position: 0, ahead_count: 0 };
        return {
            id: savedTicket.id,
            ticket_number: savedTicket.ticketNumber,
            service_id: savedTicket.serviceId,
            service_name: service.name,
            status: savedTicket.status,
            priority: savedTicket.priority,
            created_at: savedTicket.createdAt,
            qr_code: savedTicket.qrCode,
            ...qi,
        };
    }
    async findAll(user, serviceId, status) {
        const query = this.ticketRepository
            .createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.service', 'service');
        if (user.role === 'patient') {
            query.where('ticket.patientId = :patientId', { patientId: user.id });
        }
        if (serviceId) {
            query.andWhere('ticket.serviceId = :serviceId', { serviceId });
        }
        if (status) {
            query.andWhere('ticket.status = :status', { status });
        }
        const tickets = await query.getMany();
        const queueInfo = await this.enrichWithQueueInfo(tickets.map((t) => ({ id: t.id, serviceId: t.serviceId })));
        return tickets.map((ticket) => {
            const qi = queueInfo.get(ticket.id) ?? { queue_position: 0, ahead_count: 0 };
            return {
                id: ticket.id,
                ticket_number: ticket.ticketNumber,
                service_id: ticket.serviceId,
                service_name: ticket.service?.name,
                status: ticket.status,
                priority: ticket.priority,
                created_at: ticket.createdAt,
                qr_code: ticket.qrCode,
                ...qi,
            };
        });
    }
    async checkIn(id) {
        const ticket = await this.ticketRepository.findOne({ where: { id } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        ticket.status = enums_1.TicketStatus.CHECK_IN;
        ticket.checkInAt = new Date();
        await this.ticketRepository.save(ticket);
        return { message: 'Check-in realizado', ticket_number: ticket.ticketNumber };
    }
    async checkInByCode(code) {
        const trimmed = code.trim();
        let ticket = null;
        let preadmission = null;
        if (/^\d+$/.test(trimmed)) {
            ticket = await this.ticketRepository.findOne({ where: { id: +trimmed } });
        }
        else {
            ticket = await this.ticketRepository.findOne({ where: { qrCode: trimmed } });
        }
        if (!ticket) {
            if (/^\d+$/.test(trimmed)) {
                preadmission = await this.preadmissionRepository.findOne({ where: { id: +trimmed } });
            }
            else {
                preadmission = await this.preadmissionRepository.findOne({ where: { qrCode: trimmed } });
            }
        }
        if (ticket) {
            ticket.status = enums_1.TicketStatus.CHECK_IN;
            ticket.checkInAt = new Date();
            await this.ticketRepository.save(ticket);
            const queueInfo = await this.enrichWithQueueInfo([{ id: ticket.id, serviceId: ticket.serviceId }]);
            const qi = queueInfo.get(ticket.id) ?? { queue_position: 0, ahead_count: 0 };
            return {
                message: 'Llegada registrada',
                type: 'ticket',
                ticket_number: ticket.ticketNumber,
                service_id: ticket.serviceId,
                ...qi,
                status: ticket.status,
            };
        }
        if (preadmission) {
            preadmission.checkInAt = new Date();
            await this.preadmissionRepository.save(preadmission);
            const nombre = `${preadmission.name1} ${preadmission.apellido1}`.trim();
            return {
                message: 'Llegada registrada',
                preadmission_id: preadmission.id,
                paciente: nombre,
                departamento: preadmission.departamento,
                type: 'preadmission'
            };
        }
        throw new common_1.NotFoundException('Turno o preadmisión no encontrado con ese código o ID');
    }
    async call(id, windowNumber, calledBy) {
        const ticket = await this.ticketRepository.findOne({ where: { id } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        ticket.status = enums_1.TicketStatus.LLAMADO;
        ticket.calledAt = new Date();
        ticket.calledBy = calledBy;
        ticket.windowNumber = windowNumber;
        await this.ticketRepository.save(ticket);
        if (ticket.patientId && ticket.patientId > 0) {
            this.notificationsService.sendTicketCalled(ticket.patientId, ticket.ticketNumber, windowNumber).catch((error) => {
                console.error('Error sending ticket called notification:', error);
            });
        }
        return { message: 'Ticket llamado', ticket_number: ticket.ticketNumber };
    }
    async start(id) {
        const ticket = await this.ticketRepository.findOne({ where: { id } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        ticket.status = enums_1.TicketStatus.EN_ATENCION;
        ticket.startedAt = new Date();
        await this.ticketRepository.save(ticket);
        return { message: 'Atención iniciada' };
    }
    async complete(id) {
        const ticket = await this.ticketRepository.findOne({ where: { id } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        ticket.status = enums_1.TicketStatus.FINALIZADO;
        ticket.completedAt = new Date();
        await this.ticketRepository.save(ticket);
        if (ticket.patientId && ticket.patientId > 0) {
            this.surveysService.createForTicket(ticket.id).catch((error) => {
                console.error('Error creating survey for ticket:', error);
            });
        }
        return { message: 'Atención finalizada' };
    }
    async update(id, updateDto) {
        const ticket = await this.ticketRepository.findOne({ where: { id } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        if (updateDto.status)
            ticket.status = updateDto.status;
        if (updateDto.windowNumber)
            ticket.windowNumber = updateDto.windowNumber;
        if (updateDto.notes)
            ticket.notes = updateDto.notes;
        const savedTicket = await this.ticketRepository.save(ticket);
        const service = await this.serviceRepository.findOne({
            where: { id: savedTicket.serviceId },
        });
        return {
            id: savedTicket.id,
            ticket_number: savedTicket.ticketNumber,
            service_id: savedTicket.serviceId,
            service_name: service?.name,
            status: savedTicket.status,
            priority: savedTicket.priority,
            created_at: savedTicket.createdAt,
            qr_code: savedTicket.qrCode,
        };
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ticket_entity_1.Ticket)),
    __param(1, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(2, (0, typeorm_1.InjectRepository)(preadmission_entity_1.Preadmission)),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => surveys_service_1.SurveysService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        surveys_service_1.SurveysService])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map