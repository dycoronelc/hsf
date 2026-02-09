import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Survey } from '../surveys/entities/survey.entity';
import { Service } from '../services/entities/service.entity';
import { TicketStatus } from '../common/enums';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  async getSummaryReport(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Últimos 30 días
    const end = endDate || new Date();

    // Tickets
    const tickets = await this.ticketRepository.find({
      where: {
        createdAt: Between(start, end),
      },
      relations: ['service'],
    });

    const completedTickets = tickets.filter((t) => t.status === TicketStatus.FINALIZADO);
    const noShows = tickets.filter((t) => t.status === TicketStatus.NO_SHOW);

    // Calcular tiempos promedio
    const waitTimes: number[] = [];
    const serviceTimes: number[] = [];

    completedTickets.forEach((ticket) => {
      if (ticket.checkInAt && ticket.calledAt) {
        const waitTime = (ticket.calledAt.getTime() - ticket.checkInAt.getTime()) / 60000; // minutos
        waitTimes.push(waitTime);
      }
      if (ticket.calledAt && ticket.completedAt) {
        const serviceTime = (ticket.completedAt.getTime() - ticket.calledAt.getTime()) / 60000; // minutos
        serviceTimes.push(serviceTime);
      }
    });

    // Citas
    const appointments = await this.appointmentRepository.find({
      where: {
        scheduledDate: Between(start, end),
      },
    });

    const completedAppointments = appointments.filter((a) => a.status === 'completed');
    const cancelledAppointments = appointments.filter((a) => a.status === 'cancelled');

    // Encuestas
    const surveys = await this.surveyRepository.find({
      where: {
        submittedAt: Between(start, end),
        isCompleted: true,
      },
    });

    const avgNPS =
      surveys.length > 0
        ? surveys.reduce((sum, s) => sum + (s.npsScore || 0), 0) / surveys.length
        : 0;
    const avgCSAT =
      surveys.length > 0
        ? surveys.reduce((sum, s) => sum + (s.csatScore || 0), 0) / surveys.length
        : 0;

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
    };
  }

  async getRealTimeReport() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Tickets activos
    const activeTickets = await this.ticketRepository.find({
      where: [
        { status: TicketStatus.CREADO },
        { status: TicketStatus.CHECK_IN },
        { status: TicketStatus.EN_COLA },
        { status: TicketStatus.LLAMADO },
        { status: TicketStatus.EN_ATENCION },
      ],
      relations: ['service'],
    });

    // Tickets de hoy
    const todayTickets = await this.ticketRepository.find({
      where: {
        createdAt: Between(todayStart, now),
      },
      relations: ['service'],
    });

    // Agrupar por servicio
    const byService: { [key: string]: any } = {};
    const services = await this.serviceRepository.find();

    services.forEach((service) => {
      const serviceTickets = activeTickets.filter((t) => t.serviceId === service.id);
      const todayServiceTickets = todayTickets.filter((t) => t.serviceId === service.id);

      byService[service.name] = {
        serviceId: service.id,
        serviceName: service.name,
        activeTickets: serviceTickets.length,
        todayTickets: todayServiceTickets.length,
        inQueue: serviceTickets.filter((t) => t.status === TicketStatus.EN_COLA).length,
        inService: serviceTickets.filter((t) => t.status === TicketStatus.EN_ATENCION).length,
      };
    });

    return {
      timestamp: now.toISOString(),
      activeTickets: activeTickets.length,
      byService,
    };
  }

  async getEfficiencyReport(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Últimos 7 días
    const end = endDate || new Date();

    const tickets = await this.ticketRepository.find({
      where: {
        createdAt: Between(start, end),
        status: TicketStatus.FINALIZADO,
      },
      relations: ['service'],
    });

    // Agrupar por ventanilla/agente
    const byWindow: { [key: string]: any } = {};

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

    // Calcular promedios
    Object.keys(byWindow).forEach((window) => {
      const data = byWindow[window];
      data.averageServiceTime =
        data.totalTickets > 0 ? data.totalServiceTime / data.totalTickets : 0;
    });

    // Agrupar por hora del día
    const byHour: { [key: number]: number } = {};
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

  async getServiceReport(serviceId: number, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const tickets = await this.ticketRepository.find({
      where: {
        serviceId,
        createdAt: Between(start, end),
      },
    });

    const service = await this.serviceRepository.findOne({ where: { id: serviceId } });
    if (!service) {
      throw new Error('Servicio no encontrado');
    }

    const statusCounts: { [key: string]: number } = {};
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
}
