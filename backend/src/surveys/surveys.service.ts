import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from './entities/survey.entity';
import { CreateSurveyDto, SubmitSurveyDto } from './dto/survey.dto';
import { Ticket } from '../tickets/entities/ticket.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  buildEmailHtml,
  emailButton,
  emailMutedNote,
  emailParagraph,
} from '../notifications/email-template.util';

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
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
      await this.sendSurveyNotification(ticket.patientId, saved.id);
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
      relations: ['ticket'],
    });
    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada');
    }
    return survey;
  }

  async findByPatient(patientId: number): Promise<Survey[]> {
    return this.surveyRepository.find({
      where: { patientId },
      relations: ['ticket'],
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

  private async sendSurveyNotification(patientId: number, surveyId: number): Promise<void> {
    const surveyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/surveys/${surveyId}`;
    const content = buildEmailHtml({
      title: 'Encuesta de satisfacción',
      preheader: 'Su opinión nos ayuda a mejorar la atención en Hospital Santa Fe',
      bodyHtml: [
        emailParagraph(
          'Gracias por visitarnos. Su opinión es muy importante para seguir mejorando nuestro servicio.',
        ),
        emailParagraph('Complete nuestra breve encuesta; solo le tomará unos minutos:'),
        emailButton(surveyUrl, 'Completar encuesta'),
        emailMutedNote('Si ya completó la encuesta, puede ignorar este mensaje.'),
      ].join(''),
    });

    await this.notificationsService.create({
      recipientId: patientId,
      type: 'email' as any,
      subject: 'Encuesta de Satisfacción - Hospital Santa Fe',
      content,
      relatedEntityType: 'ticket',
      relatedEntityId: surveyId,
    });
  }
}
