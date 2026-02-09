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
exports.MonitorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
const service_entity_1 = require("../services/entities/service.entity");
const preadmission_entity_1 = require("../preadmission/entities/preadmission.entity");
const enums_1 = require("../common/enums");
let MonitorService = class MonitorService {
    constructor(ticketRepository, serviceRepository, preadmissionRepository) {
        this.ticketRepository = ticketRepository;
        this.serviceRepository = serviceRepository;
        this.preadmissionRepository = preadmissionRepository;
    }
    async getQueue(serviceId) {
        const service = await this.serviceRepository.findOne({
            where: { id: serviceId },
        });
        if (!service) {
            throw new common_1.NotFoundException('Servicio no encontrado');
        }
        const current = await this.ticketRepository.findOne({
            where: {
                serviceId,
                status: enums_1.TicketStatus.LLAMADO,
            },
            order: { calledAt: 'DESC' },
        });
        const queueTickets = await this.ticketRepository.find({
            where: [
                { serviceId, status: enums_1.TicketStatus.CHECK_IN },
                { serviceId, status: enums_1.TicketStatus.EN_COLA },
            ],
            order: {
                priority: 'DESC',
                createdAt: 'ASC',
            },
        });
        const currentItem = current
            ? {
                ticket_number: current.ticketNumber,
                service_name: service.name,
                priority: current.priority,
                wait_time: current.calledAt
                    ? Math.floor((new Date().getTime() - new Date(current.calledAt).getTime()) /
                        60000)
                    : null,
                status: current.status,
            }
            : null;
        const queueItems = queueTickets.map((ticket) => ({
            ticket_number: ticket.ticketNumber,
            service_name: service.name,
            priority: ticket.priority,
            wait_time: ticket.checkInAt
                ? Math.floor((new Date().getTime() - new Date(ticket.checkInAt).getTime()) /
                    60000)
                : null,
            status: ticket.status,
        }));
        const nextNumbers = queueItems.slice(0, 5).map((item) => item.ticket_number);
        return {
            service_id: service.id,
            service_name: service.name,
            current: currentItem,
            queue: queueItems,
            next_numbers: nextNumbers,
        };
    }
    async getAllQueues() {
        const services = await this.serviceRepository.find({
            where: { isActive: true },
        });
        return Promise.all(services.map((service) => this.getQueue(service.id)));
    }
    async getPreadmissionsForMonitor() {
        const pending = await this.preadmissionRepository.find({
            where: {
                status: (0, typeorm_2.In)([
                    enums_1.PreadmissionStatus.ENVIADO,
                    enums_1.PreadmissionStatus.EN_REVISION,
                    enums_1.PreadmissionStatus.REQUIERE_SUBSANACION,
                ]),
            },
            order: { fechapreadmision: 'DESC' },
            take: 100,
        });
        const byDept = pending.reduce((acc, p) => {
            const dept = p.departamento || 'OTRO';
            if (!acc[dept])
                acc[dept] = [];
            acc[dept].push({
                id: p.id,
                cedula: p.cedula,
                nombre: [p.name1, p.name2, p.apellido1, p.apellido2]
                    .filter(Boolean)
                    .join(' '),
                status: p.status,
                fechapreadmision: p.fechapreadmision,
            });
            return acc;
        }, {});
        const labels = {
            LAB: 'Laboratorio',
            RAD: 'Radiología',
            OTRO: 'Otros',
        };
        return Object.entries(byDept).map(([departamento, items]) => ({
            departamento,
            label: labels[departamento] || departamento,
            items,
        }));
    }
};
exports.MonitorService = MonitorService;
exports.MonitorService = MonitorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ticket_entity_1.Ticket)),
    __param(1, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(2, (0, typeorm_1.InjectRepository)(preadmission_entity_1.Preadmission)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], MonitorService);
//# sourceMappingURL=monitor.service.js.map