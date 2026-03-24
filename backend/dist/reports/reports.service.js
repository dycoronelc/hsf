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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
const appointment_entity_1 = require("../appointments/entities/appointment.entity");
const survey_entity_1 = require("../surveys/entities/survey.entity");
const service_entity_1 = require("../services/entities/service.entity");
const preadmission_entity_1 = require("../preadmission/entities/preadmission.entity");
const enums_1 = require("../common/enums");
let ReportsService = class ReportsService {
    constructor(ticketRepository, appointmentRepository, surveyRepository, serviceRepository, preadmissionRepository) {
        this.ticketRepository = ticketRepository;
        this.appointmentRepository = appointmentRepository;
        this.surveyRepository = surveyRepository;
        this.serviceRepository = serviceRepository;
        this.preadmissionRepository = preadmissionRepository;
    }
    async getSummaryReport(startDate, endDate) {
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate || new Date();
        const tickets = await this.ticketRepository.find({
            where: {
                createdAt: (0, typeorm_2.Between)(start, end),
            },
            relations: ['service'],
        });
        const completedTickets = tickets.filter((t) => t.status === enums_1.TicketStatus.FINALIZADO);
        const noShows = tickets.filter((t) => t.status === enums_1.TicketStatus.NO_SHOW);
        const waitTimes = [];
        const serviceTimes = [];
        completedTickets.forEach((ticket) => {
            if (ticket.checkInAt && ticket.calledAt) {
                const waitTime = (ticket.calledAt.getTime() - ticket.checkInAt.getTime()) / 60000;
                waitTimes.push(waitTime);
            }
            if (ticket.calledAt && ticket.completedAt) {
                const serviceTime = (ticket.completedAt.getTime() - ticket.calledAt.getTime()) / 60000;
                serviceTimes.push(serviceTime);
            }
        });
        const appointments = await this.appointmentRepository.find({
            where: {
                scheduledDate: (0, typeorm_2.Between)(start, end),
            },
        });
        const completedAppointments = appointments.filter((a) => a.status === 'completed');
        const cancelledAppointments = appointments.filter((a) => a.status === 'cancelled');
        const surveys = await this.surveyRepository.find({
            where: {
                submittedAt: (0, typeorm_2.Between)(start, end),
                isCompleted: true,
            },
        });
        const avgNPS = surveys.length > 0
            ? surveys.reduce((sum, s) => sum + (s.npsScore || 0), 0) / surveys.length
            : 0;
        const avgCSAT = surveys.length > 0
            ? surveys.reduce((sum, s) => sum + (s.csatScore || 0), 0) / surveys.length
            : 0;
        const preadsInPeriod = await this.preadmissionRepository.find({
            where: { fechapreadmision: (0, typeorm_2.Between)(start, end) },
        });
        const byArrivalState = {};
        for (const s of Object.values(enums_1.PreadmissionArrivalState)) {
            byArrivalState[s] = 0;
        }
        for (const p of preadsInPeriod) {
            const key = p.arrivalState && byArrivalState[p.arrivalState] !== undefined ? p.arrivalState : enums_1.PreadmissionArrivalState.ESPERA_LLEGADA;
            byArrivalState[key] = (byArrivalState[key] || 0) + 1;
        }
        const withConfirm = preadsInPeriod.filter((p) => p.confirmedArrivalAt);
        const avgMinutesToPhysicalArrival = withConfirm.length > 0
            ? withConfirm.reduce((sum, p) => sum + (p.confirmedArrivalAt.getTime() - new Date(p.fechapreadmision).getTime()) / 60000, 0) / withConfirm.length
            : 0;
        const totalPreads = preadsInPeriod.length;
        const ticketGenerated = byArrivalState[enums_1.PreadmissionArrivalState.TICKET_GENERADO] || 0;
        const awaiting = (byArrivalState[enums_1.PreadmissionArrivalState.ESPERA_LLEGADA] || 0) +
            (byArrivalState[enums_1.PreadmissionArrivalState.REGISTRADO] || 0);
        return {
            period: {
                start: start.toISOString(),
                end: end.toISOString(),
            },
            tickets: {
                total: tickets.length,
                completed: completedTickets.length,
                noShows: noShows.length,
                averageWaitTime: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
                averageServiceTime: serviceTimes.length > 0 ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length : 0,
            },
            appointments: {
                total: appointments.length,
                completed: completedAppointments.length,
                cancelled: cancelledAppointments.length,
                completionRate: appointments.length > 0 ? (completedAppointments.length / appointments.length) * 100 : 0,
            },
            satisfaction: {
                totalSurveys: surveys.length,
                averageNPS: Math.round(avgNPS * 10) / 10,
                averageCSAT: Math.round(avgCSAT * 10) / 10,
                responseRate: completedTickets.length > 0 ? (surveys.length / completedTickets.length) * 100 : 0,
            },
            preadmissions: {
                total: totalPreads,
                byArrivalState,
                awaitingArrival: awaiting,
                ticketGeneratedCount: ticketGenerated,
                ticketGeneratedRatePercent: totalPreads > 0 ? Math.round((ticketGenerated / totalPreads) * 1000) / 10 : 0,
                averageMinutesSubmitToPhysicalArrival: Math.round(avgMinutesToPhysicalArrival * 10) / 10,
            },
        };
    }
    async getRealTimeReport() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const activeTickets = await this.ticketRepository.find({
            where: [
                { status: enums_1.TicketStatus.CREADO },
                { status: enums_1.TicketStatus.CHECK_IN },
                { status: enums_1.TicketStatus.EN_COLA },
                { status: enums_1.TicketStatus.LLAMADO },
                { status: enums_1.TicketStatus.EN_ATENCION },
            ],
            relations: ['service'],
        });
        const todayTickets = await this.ticketRepository.find({
            where: {
                createdAt: (0, typeorm_2.Between)(todayStart, now),
            },
            relations: ['service'],
        });
        const byService = {};
        const services = await this.serviceRepository.find();
        services.forEach((service) => {
            const serviceTickets = activeTickets.filter((t) => t.serviceId === service.id);
            const todayServiceTickets = todayTickets.filter((t) => t.serviceId === service.id);
            byService[service.name] = {
                serviceId: service.id,
                serviceName: service.name,
                activeTickets: serviceTickets.length,
                todayTickets: todayServiceTickets.length,
                inQueue: serviceTickets.filter((t) => t.status === enums_1.TicketStatus.EN_COLA).length,
                inService: serviceTickets.filter((t) => t.status === enums_1.TicketStatus.EN_ATENCION).length,
            };
        });
        const todayPreads = await this.preadmissionRepository.find({
            where: { fechapreadmision: (0, typeorm_2.Between)(todayStart, now) },
        });
        const preadmissionArrivalToday = {};
        for (const s of Object.values(enums_1.PreadmissionArrivalState)) {
            preadmissionArrivalToday[s] = 0;
        }
        for (const p of todayPreads) {
            const key = p.arrivalState && preadmissionArrivalToday[p.arrivalState] !== undefined
                ? p.arrivalState
                : enums_1.PreadmissionArrivalState.ESPERA_LLEGADA;
            preadmissionArrivalToday[key] = (preadmissionArrivalToday[key] || 0) + 1;
        }
        return {
            timestamp: now.toISOString(),
            activeTickets: activeTickets.length,
            byService,
            preadmissionsToday: {
                total: todayPreads.length,
                byArrivalState: preadmissionArrivalToday,
            },
        };
    }
    async getEfficiencyReport(startDate, endDate) {
        const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate || new Date();
        const tickets = await this.ticketRepository.find({
            where: {
                createdAt: (0, typeorm_2.Between)(start, end),
                status: enums_1.TicketStatus.FINALIZADO,
            },
            relations: ['service'],
        });
        const byWindow = {};
        tickets.forEach((ticket) => {
            const window = ticket.windowNumber || 'Sin ventanilla';
            if (!byWindow[window]) {
                byWindow[window] = {
                    windowNumber: window,
                    totalTickets: 0,
                    totalServiceTime: 0,
                    averageServiceTime: 0,
                    tickets: [],
                };
            }
            byWindow[window].totalTickets++;
            if (ticket.calledAt && ticket.completedAt) {
                const serviceTime = (ticket.completedAt.getTime() - ticket.calledAt.getTime()) / 60000;
                byWindow[window].totalServiceTime += serviceTime;
                byWindow[window].tickets.push({
                    ticketNumber: ticket.ticketNumber,
                    serviceTime,
                });
            }
        });
        Object.keys(byWindow).forEach((window) => {
            const data = byWindow[window];
            data.averageServiceTime =
                data.totalTickets > 0 ? data.totalServiceTime / data.totalTickets : 0;
        });
        const byHour = {};
        tickets.forEach((ticket) => {
            const hour = ticket.createdAt.getHours();
            byHour[hour] = (byHour[hour] || 0) + 1;
        });
        return {
            period: {
                start: start.toISOString(),
                end: end.toISOString(),
            },
            byWindow,
            byHour,
            totalTickets: tickets.length,
        };
    }
    async getServiceReport(serviceId, startDate, endDate) {
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate || new Date();
        const tickets = await this.ticketRepository.find({
            where: {
                serviceId,
                createdAt: (0, typeorm_2.Between)(start, end),
            },
        });
        const service = await this.serviceRepository.findOne({ where: { id: serviceId } });
        if (!service) {
            throw new Error('Servicio no encontrado');
        }
        const statusCounts = {};
        tickets.forEach((ticket) => {
            statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
        });
        return {
            service: {
                id: service.id,
                name: service.name,
                code: service.code,
                area: service.area,
            },
            period: {
                start: start.toISOString(),
                end: end.toISOString(),
            },
            totalTickets: tickets.length,
            statusCounts,
        };
    }
    async getPreadmissionsReport(startDate, endDate, tipo, documento, arrivalState) {
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate || new Date();
        const qb = this.preadmissionRepository
            .createQueryBuilder('p')
            .where('p.fechapreadmision >= :start', { start })
            .andWhere('p.fechapreadmision <= :end', { end })
            .orderBy('p.fechapreadmision', 'DESC');
        if (tipo && (tipo === 'RAD' || tipo === 'LAB')) {
            qb.andWhere('p.departamento = :tipo', { tipo });
        }
        if (documento) {
            qb.andWhere('(p.cedula LIKE :doc OR p.name1 LIKE :doc OR p.apellido1 LIKE :doc)', {
                doc: `%${documento}%`,
            });
        }
        if (arrivalState && Object.values(enums_1.PreadmissionArrivalState).includes(arrivalState)) {
            qb.andWhere('p.arrivalState = :arrivalState', { arrivalState });
        }
        return qb.getMany();
    }
    async exportPreadmissionsCSV(startDate, endDate, tipo, documento, arrivalState) {
        const list = await this.getPreadmissionsReport(startDate, endDate, tipo, documento, arrivalState);
        const headers = [
            'id',
            'departamento',
            'cedula',
            'name1',
            'apellido1',
            'fechanac',
            'email',
            'celular',
            'fechaprobableatencion',
            'medico',
            'diagnostico',
            'status',
            'arrivalState',
            'confirmedArrivalAt',
            'ticketId',
            'qrCode',
            'fechapreadmision',
        ];
        const escape = (v) => v == null ? '' : String(v).replace(/"/g, '""');
        const cell = (p, h) => {
            if (h === 'confirmedArrivalAt' || h === 'fechapreadmision') {
                const d = p[h];
                if (d == null)
                    return '';
                return d instanceof Date ? d.toISOString() : String(d);
            }
            return p[h];
        };
        const rows = list.map((p) => headers.map((h) => `"${escape(cell(p, h))}"`).join(','));
        return [headers.join(','), ...rows].join('\r\n');
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ticket_entity_1.Ticket)),
    __param(1, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __param(2, (0, typeorm_1.InjectRepository)(survey_entity_1.Survey)),
    __param(3, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(4, (0, typeorm_1.InjectRepository)(preadmission_entity_1.Preadmission)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map