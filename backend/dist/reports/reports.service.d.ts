import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Survey } from '../surveys/entities/survey.entity';
import { Service } from '../services/entities/service.entity';
export declare class ReportsService {
    private ticketRepository;
    private appointmentRepository;
    private surveyRepository;
    private serviceRepository;
    constructor(ticketRepository: Repository<Ticket>, appointmentRepository: Repository<Appointment>, surveyRepository: Repository<Survey>, serviceRepository: Repository<Service>);
    getSummaryReport(startDate?: Date, endDate?: Date): Promise<{
        period: {
            start: string;
            end: string;
        };
        tickets: {
            total: number;
            completed: number;
            noShows: number;
            averageWaitTime: number;
            averageServiceTime: number;
        };
        appointments: {
            total: number;
            completed: number;
            cancelled: number;
            completionRate: number;
        };
        satisfaction: {
            totalSurveys: number;
            averageNPS: number;
            averageCSAT: number;
            responseRate: number;
        };
    }>;
    getRealTimeReport(): Promise<{
        timestamp: string;
        activeTickets: number;
        byService: {
            [key: string]: any;
        };
    }>;
    getEfficiencyReport(startDate?: Date, endDate?: Date): Promise<{
        period: {
            start: string;
            end: string;
        };
        byWindow: {
            [key: string]: any;
        };
        byHour: {
            [key: number]: number;
        };
        totalTickets: number;
    }>;
    getServiceReport(serviceId: number, startDate?: Date, endDate?: Date): Promise<{
        service: {
            id: number;
            name: string;
            code: string;
            area: string;
        };
        period: {
            start: string;
            end: string;
        };
        totalTickets: number;
        statusCounts: {
            [key: string]: number;
        };
    }>;
}
