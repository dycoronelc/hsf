import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from './entities/survey.entity';
import { CreateSurveyDto, SubmitSurveyDto } from './dto/survey.dto';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async create(createDto: CreateSurveyDto) {
    const survey = this.surveyRepository.create(createDto);
    return this.surveyRepository.save(survey);
  }

  async createForTicket(ticketId: number): Promise<Survey> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    // Verificar si ya existe una encuesta para este ticket
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

    // Enviar notificación con enlace a la encuesta
    if (ticket.patientId && ticket.patientId > 0) {
      await this.sendSurveyNotification(ticket.patientId, saved.id, 'ticket');
    }

    return saved;
  }

  async createForAppointment(appointmentId: number): Promise<Survey> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    // Verificar si ya existe una encuesta para esta cita
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

    // Enviar notificación con enlace a la encuesta
    if (appointment.patientId) {
      await this.sendSurveyNotification(appointment.patientId, saved.id, 'appointment');
    }

    return saved;
  }

  async submitSurvey(surveyId: number, submitDto: SubmitSurveyDto): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({ where: { id: surveyId } });
    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada');
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

  async findOne(id: number): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { id },
      relations: ['ticket', 'appointment'],
    });
    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada');
    }
    return survey;
  }

  async findByPatient(patientId: number): Promise<Survey[]> {
    return this.surveyRepository.find({
      where: { patientId },
      relations: ['ticket', 'appointment'],
      order: { submittedAt: 'DESC' },
    });
  }

  async getStatistics(): Promise<any> {
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

    const npsDistribution: { [key: number]: number } = {};
    const csatDistribution: { [key: number]: number } = {};

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

  private async sendSurveyNotification(
    patientId: number,
    surveyId: number,
    type: 'ticket' | 'appointment',
  ): Promise<void> {
    const surveyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/surveys/${surveyId}`;
    const content = `
      <h2>Encuesta de Satisfacción</h2>
      <p>Su opinión es muy importante para nosotros. Por favor complete nuestra breve encuesta:</p>
      <p><a href="${surveyUrl}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Completar Encuesta</a></p>
      <p>Hospital Santa Fe Panamá</p>
    `;

    await this.notificationsService.create({
      recipientId: patientId,
      type: 'email' as any,
      subject: 'Encuesta de Satisfacción - Hospital Santa Fe',
      content,
      relatedEntityType: type,
      relatedEntityId: surveyId,
    });
  }
}
