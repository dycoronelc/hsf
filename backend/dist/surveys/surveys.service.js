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
exports.SurveysService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const survey_entity_1 = require("./entities/survey.entity");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
const appointment_entity_1 = require("../appointments/entities/appointment.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let SurveysService = class SurveysService {
    constructor(surveyRepository, ticketRepository, appointmentRepository, notificationsService) {
        this.surveyRepository = surveyRepository;
        this.ticketRepository = ticketRepository;
        this.appointmentRepository = appointmentRepository;
        this.notificationsService = notificationsService;
    }
    async create(createDto) {
        const survey = this.surveyRepository.create(createDto);
        return this.surveyRepository.save(survey);
    }
    async createForTicket(ticketId) {
        const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket no encontrado');
        }
        const existing = await this.surveyRepository.findOne({
            where: { ticketId },
        });
        if (existing) {
            return existing;
        }
        const survey = this.surveyRepository.create({
            ticketId,
            patientId: ticket.patientId,
            isCompleted: false,
        });
        const saved = await this.surveyRepository.save(survey);
        if (ticket.patientId && ticket.patientId > 0) {
            await this.sendSurveyNotification(ticket.patientId, saved.id, 'ticket');
        }
        return saved;
    }
    async createForAppointment(appointmentId) {
        const appointment = await this.appointmentRepository.findOne({
            where: { id: appointmentId },
        });
        if (!appointment) {
            throw new common_1.NotFoundException('Cita no encontrada');
        }
        const existing = await this.surveyRepository.findOne({
            where: { appointmentId },
        });
        if (existing) {
            return existing;
        }
        const survey = this.surveyRepository.create({
            appointmentId,
            patientId: appointment.patientId,
            isCompleted: false,
        });
        const saved = await this.surveyRepository.save(survey);
        if (appointment.patientId) {
            await this.sendSurveyNotification(appointment.patientId, saved.id, 'appointment');
        }
        return saved;
    }
    async submitSurvey(surveyId, submitDto) {
        const survey = await this.surveyRepository.findOne({ where: { id: surveyId } });
        if (!survey) {
            throw new common_1.NotFoundException('Encuesta no encontrada');
        }
        if (survey.isCompleted) {
            throw new Error('Esta encuesta ya fue completada');
        }
        survey.npsScore = submitDto.npsScore;
        survey.csatScore = submitDto.csatScore;
        survey.comments = submitDto.comments;
        survey.isCompleted = true;
        survey.submittedAt = new Date();
        return this.surveyRepository.save(survey);
    }
    async findOne(id) {
        const survey = await this.surveyRepository.findOne({
            where: { id },
            relations: ['ticket', 'appointment'],
        });
        if (!survey) {
            throw new common_1.NotFoundException('Encuesta no encontrada');
        }
        return survey;
    }
    async findByPatient(patientId) {
        return this.surveyRepository.find({
            where: { patientId },
            relations: ['ticket', 'appointment'],
            order: { submittedAt: 'DESC' },
        });
    }
    async getStatistics() {
        const allSurveys = await this.surveyRepository.find({
            where: { isCompleted: true },
        });
        const total = allSurveys.length;
        if (total === 0) {
            return {
                total: 0,
                averageNPS: 0,
                averageCSAT: 0,
                npsDistribution: {},
                csatDistribution: {},
            };
        }
        const npsSum = allSurveys.reduce((sum, s) => sum + (s.npsScore || 0), 0);
        const csatSum = allSurveys.reduce((sum, s) => sum + (s.csatScore || 0), 0);
        const npsDistribution = {};
        const csatDistribution = {};
        allSurveys.forEach((s) => {
            if (s.npsScore !== null) {
                npsDistribution[s.npsScore] = (npsDistribution[s.npsScore] || 0) + 1;
            }
            if (s.csatScore !== null) {
                csatDistribution[s.csatScore] = (csatDistribution[s.csatScore] || 0) + 1;
            }
        });
        return {
            total,
            averageNPS: npsSum / total,
            averageCSAT: csatSum / total,
            npsDistribution,
            csatDistribution,
        };
    }
    async sendSurveyNotification(patientId, surveyId, type) {
        const surveyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/surveys/${surveyId}`;
        const content = `
      <h2>Encuesta de Satisfacción</h2>
      <p>Su opinión es muy importante para nosotros. Por favor complete nuestra breve encuesta:</p>
      <p><a href="${surveyUrl}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Completar Encuesta</a></p>
      <p>Hospital Santa Fe Panamá</p>
    `;
        await this.notificationsService.create({
            recipientId: patientId,
            type: 'email',
            subject: 'Encuesta de Satisfacción - Hospital Santa Fe',
            content,
            relatedEntityType: type,
            relatedEntityId: surveyId,
        });
    }
};
exports.SurveysService = SurveysService;
exports.SurveysService = SurveysService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(survey_entity_1.Survey)),
    __param(1, (0, typeorm_1.InjectRepository)(ticket_entity_1.Ticket)),
    __param(2, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], SurveysService);
//# sourceMappingURL=surveys.service.js.map