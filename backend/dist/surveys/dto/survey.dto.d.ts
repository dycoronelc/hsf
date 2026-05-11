export declare class CreateSurveyDto {
    ticketId?: number;
    patientId?: number;
}
export declare class SubmitSurveyDto {
    npsScore: number;
    csatScore: number;
    comments?: string;
}
