import { Repository } from 'typeorm';
import { Survey } from './entities/survey.entity';
import { CreateSurveyDto, SubmitSurveyDto } from './dto/survey.dto';
import { Ticket } from '../tickets/entities/ticket.entity';
import { NotificationsService } from '../notifications/notifications.service';
export declare class SurveysService {
    private surveyRepository;
    private ticketRepository;
    private notificationsService;
    constructor(surveyRepository: Repository<Survey>, ticketRepository: Repository<Ticket>, notificationsService: NotificationsService);
    create(createDto: CreateSurveyDto): Promise<Survey>;
    createForTicket(ticketId: number): Promise<Survey>;
    submitSurvey(surveyId: number, submitDto: SubmitSurveyDto): Promise<Survey>;
    findOne(id: number): Promise<Survey>;
    findByPatient(patientId: number): Promise<Survey[]>;
    getStatistics(): Promise<any>;
    private sendSurveyNotification;
}
