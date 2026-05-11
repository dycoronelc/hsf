import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Survey } from '../surveys/entities/survey.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { TicketStatus, PreadmissionArrivalState } from '../common/enums';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Preadmission)
    private preadmissionRepository: Repository<Preadmission>,
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

    const preadsInPeriod = await this.preadmissionRepository.find({
      where: { fechapreadmision: Between(start, end) },
    });

    const byArrivalState: Record<string, number> = {};
    for (const s of Object.values(PreadmissionArrivalState)) {
      byArrivalState[s] = 0;
    }
    for (const p of preadsInPeriod) {
      const key = p.arrivalState && byArrivalState[p.arrivalState] !== undefined ? p.arrivalState : PreadmissionArrivalState.ESPERA_LLEGADA;
      byArrivalState[key] = (byArrivalState[key] || 0) + 1;
    }

    const withConfirm = preadsInPeriod.filter((p) => p.confirmedArrivalAt);
    const avgMinutesToPhysicalArrival =
      withConfirm.length > 0
        ? withConfirm.reduce(
            (sum, p) =>
              sum + (p.confirmedArrivalAt!.getTime() - new Date(p.fechapreadmision).getTime()) / 60000,
            0,
          ) / withConfirm.length
        : 0;

    const totalPreads = preadsInPeriod.length;
    const ticketGenerated = byArrivalState[PreadmissionArrivalState.TICKET_GENERADO] || 0;
    const awaiting =
      (byArrivalState[PreadmissionArrivalState.ESPERA_LLEGADA] || 0) +
      (byArrivalState[PreadmissionArrivalState.REGISTRADO] || 0);

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
        ticketGeneratedRatePercent:
          totalPreads > 0 ? Math.round((ticketGenerated / totalPreads) * 1000) / 10 : 0,
        averageMinutesSubmitToPhysicalArrival:
          Math.round(avgMinutesToPhysicalArrival * 10) / 10,
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

    const todayPreads = await this.preadmissionRepository.find({
      where: { fechapreadmision: Between(todayStart, now) },
    });
    const preadmissionArrivalToday: Record<string, number> = {};
    for (const s of Object.values(PreadmissionArrivalState)) {
      preadmissionArrivalToday[s] = 0;
    }
    for (const p of todayPreads) {
      const key =
        p.arrivalState && preadmissionArrivalToday[p.arrivalState] !== undefined
          ? p.arrivalState
          : PreadmissionArrivalState.ESPERA_LLEGADA;
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

  /** Listado de preadmisiones con filtros (fecha, tipo, documento, estado de llegada) */
  async getPreadmissionsReport(
    startDate?: Date,
    endDate?: Date,
    tipo?: string,
    documento?: string,
    arrivalState?: PreadmissionArrivalState,
  ): Promise<Preadmission[]> {
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
    if (arrivalState && Object.values(PreadmissionArrivalState).includes(arrivalState)) {
      qb.andWhere('p.arrivalState = :arrivalState', { arrivalState });
    }
    return qb.getMany();
  }

  /** Exportar preadmisiones a CSV (documento: exportación CSV) */
  async exportPreadmissionsCSV(
    startDate?: Date,
    endDate?: Date,
    tipo?: string,
    documento?: string,
    arrivalState?: PreadmissionArrivalState,
  ): Promise<string> {
    const list = await this.getPreadmissionsReport(startDate, endDate, tipo, documento, arrivalState);
    const headers = [
      'id',
      'departamento',
      'registradoComo',
      'cedula',
      'name1',
      'apellido1',
      'fechanac',
      'email',
      'celular',
      'fechaprobableatencion',
      'medico',
      'procedimientoEstudio',
      'diagnostico',
      'status',
      'arrivalState',
      'confirmedArrivalAt',
      'ticketId',
      'qrCode',
      'fechapreadmision',
    ];
    const escape = (v: unknown) =>
      v == null ? '' : String(v).replace(/"/g, '""');
    const cell = (p: Preadmission, h: string) => {
      if (h === 'confirmedArrivalAt' || h === 'fechapreadmision') {
        const d = (p as any)[h] as Date | string | null | undefined;
        if (d == null) return '';
        return d instanceof Date ? d.toISOString() : String(d);
      }
      return (p as any)[h];
    };
    const rows = list.map((p) =>
      headers.map((h) => `"${escape(cell(p, h))}"`).join(','),
    );
    return [headers.join(','), ...rows].join('\r\n');
  }

  async exportPreadmissionsExcel(
    startDate?: Date,
    endDate?: Date,
    tipo?: string,
    documento?: string,
    arrivalState?: PreadmissionArrivalState,
  ): Promise<string> {
    const csv = await this.exportPreadmissionsCSV(startDate, endDate, tipo, documento, arrivalState);
    const rows = csv.split(/\r?\n/).map((line) => line.split(',').map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"')));
    const escapeXml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const body = rows
      .map(
        (row) =>
          `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('')}</Row>`,
      )
      .join('');
    return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Preadmisiones"><Table>${body}</Table></Worksheet></Workbook>`;
  }
}
