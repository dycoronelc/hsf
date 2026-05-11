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
const agent_utils_1 = require("../common/agent-utils");
const audit_service_1 = require("../audit/audit.service");
let TicketsService = class TicketsService {
    constructor(ticketRepository, serviceRepository, preadmissionRepository, notificationsService, surveysService, auditService) {
        this.ticketRepository = ticketRepository;
        this.serviceRepository = serviceRepository;
        this.preadmissionRepository = preadmissionRepository;
        this.notificationsService = notificationsService;
        this.surveysService = surveysService;
        this.auditService = auditService;
    }
    generateTicketNumber(service) {
        const prefix = service.ticketPrefix || service.code;
        const randomSuffix = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        return `${prefix}-${randomSuffix}`;
    }
    assertAgentCanOperate(user) {
        if (!user)
            return;
        if (!(0, agent_utils_1.isAgentOperational)(user.agentState)) {
            throw new common_1.BadRequestException('No puede llamar ni gestionar tickets mientras está en un estado no operativo');
        }
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
        const services = await this.serviceRepository.findBy({ id: (0, typeorm_2.In)(serviceIds) });
        const serviceById = new Map(services.map((s) => [s.id, s]));
        const serviceMaps = await Promise.all(serviceIds.map(async (sid) => [sid, await this.getQueuePositionsByService(sid)]));
        const byService = new Map(serviceMaps);
        const out = new Map();
        for (const t of tickets) {
            const pos = byService.get(t.serviceId)?.get(t.id) ?? 0;
            const ahead = Math.max(0, pos - 1);
            const minutesPerTicket = serviceById.get(t.serviceId)?.estimatedTime ?? 15;
            const waitSeconds = ahead * minutesPerTicket * 60;
            const hours = Math.floor(waitSeconds / 3600);
            const minutes = Math.floor((waitSeconds % 3600) / 60);
            const seconds = waitSeconds % 60;
            const label = `${hours}h ${minutes}m ${seconds}s`;
            out.set(t.id, {
                queue_position: pos,
                ahead_count: ahead,
                estimated_wait_seconds: waitSeconds,
                estimated_wait_label: label,
            });
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
            ticketNumber: this.generateTicketNumber(service),
            patientId: null,
            serviceId: createDto.serviceId,
            priority: createDto.priority || enums_1.Priority.NORMAL,
            status: enums_1.TicketStatus.CREADO,
            qrCode: this.generateQrCode(),
        });
        const savedTicket = await this.ticketRepository.save(ticket);
        const queueInfo = await this.enrichWithQueueInfo([{ id: savedTicket.id, serviceId: savedTicket.serviceId }]);
        const qi = queueInfo.get(savedTicket.id) ?? {
            queue_position: 0,
            ahead_count: 0,
            estimated_wait_seconds: 0,
            estimated_wait_label: '0h 0m 0s',
        };
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
            ticketNumber: this.generateTicketNumber(service),
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
        const qi = queueInfo.get(savedTicket.id) ?? {
            queue_position: 0,
            ahead_count: 0,
            estimated_wait_seconds: 0,
            estimated_wait_label: '0h 0m 0s',
        };
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
            const qi = queueInfo.get(ticket.id) ?? {
                queue_position: 0,
                ahead_count: 0,
                estimated_wait_seconds: 0,
                estimated_wait_label: '0h 0m 0s',
            };
            return {
                id: ticket.id,
                ticket_number: ticket.ticketNumber,
                service_id: ticket.serviceId,
                service_name: ticket.service?.name,
                status: ticket.status,
                priority: ticket.priority,
                priority_level: ticket.service?.priorityLevel ?? 2,
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
            const qi = queueInfo.get(ticket.id) ?? {
                queue_position: 0,
                ahead_count: 0,
                estimated_wait_seconds: 0,
                estimated_wait_label: '0h 0m 0s',
            };
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
            if (preadmission.arrivalState === enums_1.PreadmissionArrivalState.ESPERA_LLEGADA ||
                preadmission.arrivalState === enums_1.PreadmissionArrivalState.REGISTRADO) {
                preadmission.arrivalState = enums_1.PreadmissionArrivalState.PACIENTE_PRESENTE;
                preadmission.confirmedArrivalAt = new Date();
            }
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
    async call(id, windowNumber, agent) {
        this.assertAgentCanOperate(agent);
        const ticket = await this.ticketRepository.findOne({ where: { id } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        ticket.status = enums_1.TicketStatus.LLAMADO;
        ticket.calledAt = new Date();
        ticket.calledBy = agent.id;
        ticket.windowNumber = windowNumber;
        await this.ticketRepository.save(ticket);
        await this.auditService.log('ticket_called', {
            entityType: 'ticket',
            entityId: ticket.id,
            userId: agent.id,
            details: `window=${windowNumber}`,
        });
        if (ticket.patientId && ticket.patientId > 0) {
            this.notificationsService.sendTicketCalled(ticket.patientId, ticket.ticketNumber, windowNumber).catch((error) => {
                console.error('Error sending ticket called notification:', error);
            });
        }
        return { message: 'Ticket llamado', ticket_number: ticket.ticketNumber };
    }
    async start(id, agent) {
        this.assertAgentCanOperate(agent);
        const ticket = await this.ticketRepository.findOne({ where: { id } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        ticket.status = enums_1.TicketStatus.EN_ATENCION;
        ticket.startedAt = new Date();
        await this.ticketRepository.save(ticket);
        await this.auditService.log('ticket_started', {
            entityType: 'ticket',
            entityId: ticket.id,
            userId: agent?.id,
        });
        return { message: 'Atención iniciada' };
    }
    async complete(id, agent) {
        this.assertAgentCanOperate(agent);
        const ticket = await this.ticketRepository.findOne({ where: { id } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        ticket.status = enums_1.TicketStatus.FINALIZADO;
        ticket.completedAt = new Date();
        await this.ticketRepository.save(ticket);
        await this.auditService.log('ticket_completed', {
            entityType: 'ticket',
            entityId: ticket.id,
            userId: agent?.id,
        });
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
    async transfer(id, dto, agent) {
        this.assertAgentCanOperate(agent);
        const ticket = await this.ticketRepository.findOne({ where: { id }, relations: ['service'] });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        const radService = await this.serviceRepository.findOne({ where: { area: 'RAD', isActive: true } });
        const labService = await this.serviceRepository.findOne({ where: { area: 'LAB', isActive: true } });
        if (dto.targetArea === 'BOTH') {
            const otherArea = ticket.service?.area === 'RAD' ? labService : radService;
            if (!otherArea) {
                throw new common_1.NotFoundException('No se encontró servicio para el área adicional');
            }
            const newTicket = this.ticketRepository.create({
                ticketNumber: this.generateTicketNumber(otherArea),
                patientId: ticket.patientId,
                serviceId: otherArea.id,
                status: enums_1.TicketStatus.CREADO,
                priority: ticket.priority,
                qrCode: this.generateQrCode(),
            });
            await this.ticketRepository.save(newTicket);
            await this.auditService.log('ticket_transferred', {
                entityType: 'ticket',
                entityId: ticket.id,
                userId: agent?.id,
                details: `targetArea=${dto.targetArea}`,
            });
            return { message: 'Ticket duplicado para ambos servicios', originalId: id, newTicketId: newTicket.id };
        }
        const targetService = dto.targetArea === 'RAD' ? radService : labService;
        if (!targetService) {
            throw new common_1.NotFoundException(`No se encontró servicio de ${dto.targetArea === 'RAD' ? 'Radiología' : 'Laboratorio'}`);
        }
        ticket.serviceId = targetService.id;
        ticket.status = enums_1.TicketStatus.TRANSFERIDO;
        ticket.completedAt = new Date();
        await this.ticketRepository.save(ticket);
        await this.auditService.log('ticket_transferred', {
            entityType: 'ticket',
            entityId: ticket.id,
            userId: agent?.id,
            details: `targetArea=${dto.targetArea}`,
        });
        return { message: 'Ticket transferido', service_id: targetService.id, service_name: targetService.name };
    }
    async createTicketForPreadmission(preadmissionId) {
        const pre = await this.preadmissionRepository.findOne({ where: { id: preadmissionId } });
        if (!pre) {
            throw new common_1.NotFoundException('Preadmisión no encontrada');
        }
        if (pre.arrivalState !== enums_1.PreadmissionArrivalState.PACIENTE_PRESENTE) {
            throw new common_1.BadRequestException('El paciente debe estar marcado como presente');
        }
        if (pre.ticketId) {
            throw new common_1.BadRequestException('Ya existe un ticket asociado a esta preadmisión');
        }
        const admService = await this.serviceRepository.findOne({
            where: { code: 'ADM', isActive: true },
        });
        if (!admService) {
            throw new common_1.NotFoundException('Servicio de Admisión (ADM) no configurado');
        }
        const ticket = this.ticketRepository.create({
            ticketNumber: this.generateTicketNumber(admService),
            patientId: pre.patientId ?? null,
            serviceId: admService.id,
            priority: enums_1.Priority.NORMAL,
            status: enums_1.TicketStatus.CREADO,
            qrCode: this.generateQrCode(),
            preadmissionId: pre.id,
        });
        const savedTicket = await this.ticketRepository.save(ticket);
        pre.ticketId = savedTicket.id;
        pre.arrivalState = enums_1.PreadmissionArrivalState.TICKET_GENERADO;
        await this.preadmissionRepository.save(pre);
        const queueInfo = await this.enrichWithQueueInfo([{ id: savedTicket.id, serviceId: savedTicket.serviceId }]);
        const qi = queueInfo.get(savedTicket.id) ?? {
            queue_position: 0,
            ahead_count: 0,
            estimated_wait_seconds: 0,
            estimated_wait_label: '0h 0m 0s',
        };
        return {
            id: savedTicket.id,
            ticket_number: savedTicket.ticketNumber,
            service_id: savedTicket.serviceId,
            service_name: admService.name,
            status: savedTicket.status,
            priority: savedTicket.priority,
            created_at: savedTicket.createdAt,
            qr_code: savedTicket.qrCode,
            preadmission_id: pre.id,
            ...qi,
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
        surveys_service_1.SurveysService,
        audit_service_1.AuditService])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map