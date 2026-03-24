import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getSummary(startDate?: string, endDate?: string): Promise<{
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
        preadmissions: {
            total: number;
            byArrivalState: Record<string, number>;
            awaitingArrival: number;
            ticketGeneratedCount: number;
            ticketGeneratedRatePercent: number;
            averageMinutesSubmitToPhysicalArrival: number;
        };
    }>;
    getRealTime(): Promise<{
        timestamp: string;
        activeTickets: number;
        byService: {
            [key: string]: any;
        };
        preadmissionsToday: {
            total: number;
            byArrivalState: Record<string, number>;
        };
    }>;
    getEfficiency(startDate?: string, endDate?: string): Promise<{
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
    getServiceReport(serviceId: number, startDate?: string, endDate?: string): Promise<{
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
    getPreadmissionsReport(startDate?: string, endDate?: string, tipo?: string, documento?: string, arrivalState?: string): Promise<import("../preadmission/entities/preadmission.entity").Preadmission[]>;
    exportPreadmissions(format: string, startDate?: string, endDate?: string, tipo?: string, documento?: string, arrivalState?: string): Promise<import("../preadmission/entities/preadmission.entity").Preadmission[] | {
        csv: string;
    }>;
    private parseArrivalState;
}
