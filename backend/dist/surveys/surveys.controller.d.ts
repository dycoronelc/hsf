import { SurveysService } from './surveys.service';
import { CreateSurveyDto, SubmitSurveyDto } from './dto/survey.dto';
export declare class SurveysController {
    private readonly surveysService;
    constructor(surveysService: SurveysService);
    create(createDto: CreateSurveyDto): Promise<import("./entities/survey.entity").Survey>;
    getStatistics(): Promise<any>;
    findOne(id: number): Promise<import("./entities/survey.entity").Survey>;
    submit(id: number, submitDto: SubmitSurveyDto): Promise<import("./entities/survey.entity").Survey>;
    findByPatient(patientId: number): Promise<import("./entities/survey.entity").Survey[]>;
}
