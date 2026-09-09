import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Survey } from '../surveys/entities/survey.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { User } from '../users/entities/user.entity';
import { TicketStatus, PreadmissionArrivalState, UserRole } from '../common/enums';
import {
  getHourInAppTimezone,
  panamaDayEnd,
  panamaDayStart,
  panamaTodayYmd,
  resolveReportDateRange,
  toIsoUtc,
  toPanamaOffsetIso,
  APP_TIMEZONE,
} from '../common/timezone';
import { defaultSlaForService } from './sla-defaults';

export type TicketReportFilters = {
  serviceId?: number;
  /** Código o prefijo de ticket (ADM, T, CTA, LR, RD, URG…). */
  serviceCode?: string;
  windowNumber?: string;
  agentId?: number;
};

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
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /** Agentes / oficiales que pueden aparecer en reportes (no pacientes). */
  async listReportAgents(): Promise<
    Array<{ id: number; fullName: string | null; email: string; role: string }>
  > {
    const users = await this.userRepository
      .createQueryBuilder('u')
      .select(['u.id', 'u.fullName', 'u.email', 'u.role', 'u.isActive'])
      .where('u.role != :patient', { patient: UserRole.PATIENT })
      .andWhere('u.isActive = true')
      .orderBy('u.fullName', 'ASC')
      .addOrderBy('u.email', 'ASC')
      .getMany();
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
    }));
  }

  private async resolveServiceIds(filters: TicketReportFilters): Promise<number[] | null> {
    if (filters.serviceId != null && !Number.isNaN(filters.serviceId)) {
      return [filters.serviceId];
    }
    const code = (filters.serviceCode || '').trim().toUpperCase();
    if (!code) return null;
    const services = await this.serviceRepository.find({ where: { isActive: true } });
    const matched = services.filter((s) => {
      const svcCode = String(s.code || '').toUpperCase();
      const prefix = String(s.ticketPrefix || '').toUpperCase();
      const area = String(s.area || '').toUpperCase();
      return svcCode === code || prefix === code || area === code;
    });
    return matched.map((s) => s.id);
  }

  private applyTicketFilters(
    qb: ReturnType<Repository<Ticket>['createQueryBuilder']>,
    alias: string,
    filters: TicketReportFilters,
    serviceIds: number[] | null,
  ) {
    if (serviceIds != null) {
      if (serviceIds.length === 0) {
        qb.andWhere('1 = 0');
      } else {
        qb.andWhere(`${alias}.serviceId IN (:...serviceIds)`, { serviceIds });
      }
    }
    const window = (filters.windowNumber || '').trim();
    if (window) {
      qb.andWhere(`TRIM(COALESCE(${alias}.windowNumber, '')) = :windowNumber`, {
        windowNumber: window,
      });
    }
    if (filters.agentId != null && !Number.isNaN(filters.agentId)) {
      qb.andWhere(`${alias}.calledBy = :agentId`, { agentId: filters.agentId });
    }
  }

  /** Listado editable de SLA por servicio activo. */
  async listSlaParameters(): Promise<
    Array<{
      service_id: number;
      service_name: string;
      service_code: string;
      ticket_prefix: string | null;
      sla_wait_minutes: number;
      sla_attention_minutes: number;
    }>
  > {
    const services = await this.serviceRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    // Rellena defaults en BD la primera vez que se consultan.
    for (const svc of services) {
      const resolved = defaultSlaForService(svc);
      let dirty = false;
      if (svc.slaWaitMinutes == null) {
        svc.slaWaitMinutes = resolved.wait;
        dirty = true;
      }
      if (svc.slaAttentionMinutes == null) {
        svc.slaAttentionMinutes = resolved.attention;
        dirty = true;
      }
      if (dirty) await this.serviceRepository.save(svc);
    }
    return services.map((svc) => {
      const resolved = defaultSlaForService(svc);
      return {
        service_id: svc.id,
        service_name: svc.name,
        service_code: svc.code,
        ticket_prefix: svc.ticketPrefix,
        sla_wait_minutes: resolved.wait,
        sla_attention_minutes: resolved.attention,
      };
    });
  }

  async updateSlaParameters(
    items: Array<{ serviceId: number; slaWaitMinutes: number; slaAttentionMinutes: number }>,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const item of items) {
      const wait = Number(item.slaWaitMinutes);
      const attention = Number(item.slaAttentionMinutes);
      if (!item.serviceId || Number.isNaN(wait) || Number.isNaN(attention)) continue;
      if (wait < 1 || attention < 1 || wait > 480 || attention > 480) {
        throw new BadRequestException('Los minutos de SLA deben estar entre 1 y 480');
      }
      const svc = await this.serviceRepository.findOne({ where: { id: item.serviceId } });
      if (!svc) continue;
      svc.slaWaitMinutes = Math.round(wait);
      svc.slaAttentionMinutes = Math.round(attention);
      await this.serviceRepository.save(svc);
      updated++;
    }
    return { updated };
  }

  private async findTicketsInRange(
    start: Date,
    end: Date,
    filters: TicketReportFilters,
    status?: TicketStatus | TicketStatus[],
  ): Promise<Ticket[]> {
    const serviceIds = await this.resolveServiceIds(filters);
    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.service', 'service')
      .where('ticket.createdAt >= :start', { start })
      .andWhere('ticket.createdAt <= :end', { end });
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      qb.andWhere('ticket.status IN (:...statuses)', { statuses });
    }
    this.applyTicketFilters(qb, 'ticket', filters, serviceIds);
    return qb.orderBy('ticket.createdAt', 'ASC').getMany();
  }

  /** Minutos → "H:MM" (p. ej. 21 → "0:21"). */
  private formatDurationMinutes(minutes: number | null | undefined): string {
    if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return '';
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  private panamaDateLabel(value: Date): string {
    return new Intl.DateTimeFormat('es-PA', {
      timeZone: APP_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value);
  }

  private panamaTimeLabel(value: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(value);
  }

  private periodLabel(start: Date, end: Date): string {
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: APP_TIMEZONE,
      month: 'long',
      year: 'numeric',
    };
    const startMonth = new Intl.DateTimeFormat('es-PA', opts).format(start);
    const endMonth = new Intl.DateTimeFormat('es-PA', opts).format(end);
    if (startMonth === endMonth) {
      return startMonth.charAt(0).toUpperCase() + startMonth.slice(1);
    }
    return `${this.panamaDateLabel(start)} — ${this.panamaDateLabel(end)}`;
  }

  private ticketEntryAt(ticket: Ticket): Date | null {
    return ticket.checkInAt || ticket.createdAt || null;
  }

  private ticketStartAt(ticket: Ticket): Date | null {
    return ticket.startedAt || ticket.calledAt || null;
  }

  private ticketExitAt(ticket: Ticket): Date | null {
    return ticket.completedAt || null;
  }

  private statusLabel(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.FINALIZADO:
        return 'Atendido';
      case TicketStatus.NO_SHOW:
        return 'No Presentado';
      case TicketStatus.LLAMADO:
        return 'Llamado';
      case TicketStatus.EN_ATENCION:
        return 'En atención';
      case TicketStatus.CHECK_IN:
        return 'Arribado';
      case TicketStatus.CREADO:
        return 'Creado';
      case TicketStatus.CANCELADO:
        return 'Cancelado';
      case TicketStatus.TRANSFERIDO:
        return 'Transferido';
      default:
        return status;
    }
  }

  private buildManagementTables(tickets: Ticket[], start: Date, end: Date) {
    type Acc = {
      serviceId: number;
      serviceName: string;
      serviceCode: string;
      ticketPrefix: string | null;
      slaWaitMinutes: number;
      slaAttentionMinutes: number;
      issued: number;
      attended: number;
      noShows: number;
      waitSum: number;
      waitCount: number;
      attentionSum: number;
      attentionCount: number;
      waitSlaMet: number;
      waitSlaEligible: number;
    };

    const byService = new Map<number, Acc>();

    const details = tickets.map((ticket) => {
      const service = ticket.service;
      const serviceId = ticket.serviceId;
      const serviceName = service?.name || `Servicio ${serviceId}`;
      const serviceCode = service?.code || '';
      const ticketPrefix = service?.ticketPrefix ?? null;
      const sla = defaultSlaForService(service || { code: serviceCode, estimatedTime: 15 });
      const entryAt = this.ticketEntryAt(ticket);
      const startAt = this.ticketStartAt(ticket);
      const exitAt = this.ticketExitAt(ticket);
      const isAttended = ticket.status === TicketStatus.FINALIZADO;
      const isNoShow = ticket.status === TicketStatus.NO_SHOW;

      let waitMinutes: number | null = null;
      let attentionMinutes: number | null = null;
      if (entryAt && startAt) {
        waitMinutes = Math.max(0, (startAt.getTime() - entryAt.getTime()) / 60000);
      }
      if (startAt && exitAt) {
        attentionMinutes = Math.max(0, (exitAt.getTime() - startAt.getTime()) / 60000);
      }

      let cumpleSla: boolean | null = null;
      if (isAttended && attentionMinutes != null) {
        cumpleSla = attentionMinutes <= sla.attention;
      }

      let acc = byService.get(serviceId);
      if (!acc) {
        acc = {
          serviceId,
          serviceName,
          serviceCode,
          ticketPrefix,
          slaWaitMinutes: sla.wait,
          slaAttentionMinutes: sla.attention,
          issued: 0,
          attended: 0,
          noShows: 0,
          waitSum: 0,
          waitCount: 0,
          attentionSum: 0,
          attentionCount: 0,
          waitSlaMet: 0,
          waitSlaEligible: 0,
        };
        byService.set(serviceId, acc);
      }
      acc.issued++;
      if (isAttended) acc.attended++;
      if (isNoShow) acc.noShows++;
      if (waitMinutes != null && (isAttended || startAt)) {
        acc.waitSum += waitMinutes;
        acc.waitCount++;
        if (isAttended) {
          acc.waitSlaEligible++;
          if (waitMinutes <= sla.wait) acc.waitSlaMet++;
        }
      }
      if (isAttended && attentionMinutes != null) {
        acc.attentionSum += attentionMinutes;
        acc.attentionCount++;
      }

      return {
        id: ticket.id,
        date: entryAt ? this.panamaDateLabel(entryAt) : '',
        date_iso: entryAt ? toPanamaOffsetIso(entryAt) : null,
        service_id: serviceId,
        service_name: serviceName,
        service_code: serviceCode,
        ticket_prefix: ticketPrefix,
        ticket_number: ticket.ticketNumber,
        entry_at: entryAt ? toPanamaOffsetIso(entryAt) : null,
        entry_time: entryAt ? this.panamaTimeLabel(entryAt) : '',
        start_at: startAt ? toPanamaOffsetIso(startAt) : null,
        start_time: startAt ? this.panamaTimeLabel(startAt) : '',
        exit_at: exitAt ? toPanamaOffsetIso(exitAt) : null,
        exit_time: exitAt ? this.panamaTimeLabel(exitAt) : '',
        wait_minutes: waitMinutes != null ? Math.round(waitMinutes * 10) / 10 : null,
        wait_label:
          isNoShow && waitMinutes == null
            ? '—'
            : waitMinutes != null
              ? this.formatDurationMinutes(waitMinutes)
              : '—',
        attention_minutes: attentionMinutes != null ? Math.round(attentionMinutes * 10) / 10 : null,
        attention_label:
          attentionMinutes != null
            ? this.formatDurationMinutes(attentionMinutes)
            : isNoShow
              ? '0:00'
              : '—',
        status: ticket.status,
        status_label: this.statusLabel(ticket.status),
        sla_wait_minutes: sla.wait,
        sla_attention_minutes: sla.attention,
        meets_sla: cumpleSla,
        meets_sla_label: cumpleSla == null ? '' : cumpleSla ? 'Sí' : 'No',
        window_number: ticket.windowNumber ?? null,
        called_by: ticket.calledBy ?? null,
      };
    });

    const byServiceRows = [...byService.values()]
      .sort((a, b) => a.serviceName.localeCompare(b.serviceName, 'es'))
      .map((acc) => {
        const avgWait = acc.waitCount > 0 ? acc.waitSum / acc.waitCount : 0;
        const avgAttention = acc.attentionCount > 0 ? acc.attentionSum / acc.attentionCount : 0;
        const noShowPct = acc.issued > 0 ? (acc.noShows / acc.issued) * 100 : 0;
        const waitSlaPct =
          acc.waitSlaEligible > 0 ? (acc.waitSlaMet / acc.waitSlaEligible) * 100 : 0;
        let attentionSlaMet = 0;
        let attentionSlaEligible = 0;
        for (const d of details) {
          if (d.service_id !== acc.serviceId) continue;
          if (d.status !== TicketStatus.FINALIZADO) continue;
          if (d.attention_minutes == null) continue;
          attentionSlaEligible++;
          if (d.attention_minutes <= acc.slaAttentionMinutes) attentionSlaMet++;
        }
        const attentionSlaPct =
          attentionSlaEligible > 0 ? (attentionSlaMet / attentionSlaEligible) * 100 : 0;
        return {
          service_id: acc.serviceId,
          service_name: acc.serviceName,
          service_code: acc.serviceCode,
          ticket_prefix: acc.ticketPrefix,
          tickets_issued: acc.issued,
          tickets_attended: acc.attended,
          no_show_percent: Math.round(noShowPct * 10) / 10,
          avg_wait_minutes: Math.round(avgWait * 10) / 10,
          avg_wait_label: this.formatDurationMinutes(avgWait),
          avg_attention_minutes: Math.round(avgAttention * 10) / 10,
          avg_attention_label: this.formatDurationMinutes(avgAttention),
          sla_wait_minutes: acc.slaWaitMinutes,
          sla_wait_label: `${acc.slaWaitMinutes} min`,
          sla_attention_minutes: acc.slaAttentionMinutes,
          sla_attention_label: `${acc.slaAttentionMinutes} min`,
          // Compat: objetivo mostrado en consolidado = espera (como imagen original)
          sla_objective_minutes: acc.slaWaitMinutes,
          sla_objective_label: `${acc.slaWaitMinutes} min`,
          // Cumplimiento del consolidado = % espera dentro de SLA
          sla_met_percent: Math.round(waitSlaPct * 10) / 10,
          sla_attention_met_percent: Math.round(attentionSlaPct * 10) / 10,
        };
      });

    const totalIssued = byServiceRows.reduce((s, r) => s + r.tickets_issued, 0);
    const totalAttended = byServiceRows.reduce((s, r) => s + r.tickets_attended, 0);
    const totalNoShows = [...byService.values()].reduce((s, a) => s + a.noShows, 0);
    const allWait = [...byService.values()].reduce(
      (acc, a) => ({ sum: acc.sum + a.waitSum, count: acc.count + a.waitCount }),
      { sum: 0, count: 0 },
    );
    const allAtt = [...byService.values()].reduce(
      (acc, a) => ({ sum: acc.sum + a.attentionSum, count: acc.count + a.attentionCount }),
      { sum: 0, count: 0 },
    );
    let totalSlaMet = 0;
    let totalSlaEligible = 0;
    for (const d of details) {
      if (d.status !== TicketStatus.FINALIZADO || d.wait_minutes == null) continue;
      totalSlaEligible++;
      if (d.wait_minutes <= d.sla_wait_minutes) totalSlaMet++;
    }
    const avgWait = allWait.count > 0 ? allWait.sum / allWait.count : 0;
    const avgAttention = allAtt.count > 0 ? allAtt.sum / allAtt.count : 0;

    // Matriz diaria: promedio de T. atención por fecha × servicio (solo atendidos).
    const serviceColumns = byServiceRows.map((r) => ({
      service_id: r.service_id,
      service_name: r.service_name,
      service_code: r.service_code,
    }));
    type DayCell = { sum: number; count: number };
    const dayMap = new Map<string, Map<number, DayCell>>();
    for (const d of details) {
      if (d.status !== TicketStatus.FINALIZADO || d.attention_minutes == null || !d.date) continue;
      if (!dayMap.has(d.date)) dayMap.set(d.date, new Map());
      const svcMap = dayMap.get(d.date)!;
      const cell = svcMap.get(d.service_id) || { sum: 0, count: 0 };
      cell.sum += d.attention_minutes;
      cell.count += 1;
      svcMap.set(d.service_id, cell);
    }

    const parseDateKey = (ddmmyyyy: string): number => {
      const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return 0;
      return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    };

    const dailyRows = [...dayMap.entries()]
      .sort((a, b) => parseDateKey(a[0]) - parseDateKey(b[0]))
      .map(([date, svcMap]) => {
        const values: Record<
          string,
          { minutes: number | null; label: string }
        > = {};
        let daySum = 0;
        let dayCount = 0;
        for (const col of serviceColumns) {
          const cell = svcMap.get(col.service_id);
          if (cell && cell.count > 0) {
            const avg = cell.sum / cell.count;
            values[String(col.service_id)] = {
              minutes: Math.round(avg * 10) / 10,
              label: this.formatDurationMinutes(avg),
            };
            daySum += cell.sum;
            dayCount += cell.count;
          } else {
            values[String(col.service_id)] = { minutes: null, label: '' };
          }
        }
        const dayAvg = dayCount > 0 ? daySum / dayCount : null;
        return {
          date,
          values,
          day_average_minutes: dayAvg != null ? Math.round(dayAvg * 10) / 10 : null,
          day_average_label: dayAvg != null ? this.formatDurationMinutes(dayAvg) : '',
        };
      });

    return {
      period_label: this.periodLabel(start, end),
      by_service: byServiceRows,
      totals: {
        tickets_issued: totalIssued,
        tickets_attended: totalAttended,
        no_show_percent:
          totalIssued > 0 ? Math.round((totalNoShows / totalIssued) * 1000) / 10 : 0,
        avg_wait_minutes: Math.round(avgWait * 10) / 10,
        avg_wait_label: this.formatDurationMinutes(avgWait),
        avg_attention_minutes: Math.round(avgAttention * 10) / 10,
        avg_attention_label: this.formatDurationMinutes(avgAttention),
        sla_met_percent:
          totalSlaEligible > 0 ? Math.round((totalSlaMet / totalSlaEligible) * 1000) / 10 : 0,
      },
      ticket_details: details,
      daily_attention: {
        services: serviceColumns,
        rows: dailyRows,
        overall_average_minutes: Math.round(avgAttention * 10) / 10,
        overall_average_label: this.formatDurationMinutes(avgAttention),
      },
    };
  }

  async getSummaryReport(
    startDate?: string | null,
    endDate?: string | null,
    filters: TicketReportFilters = {},
  ) {
    const { start, end } = resolveReportDateRange(startDate, endDate, 30);
    const tickets = await this.findTicketsInRange(start, end, filters);

    const completedTickets = tickets.filter((t) => t.status === TicketStatus.FINALIZADO);
    const noShows = tickets.filter((t) => t.status === TicketStatus.NO_SHOW);

    const waitTimes: number[] = [];
    const serviceTimes: number[] = [];

    completedTickets.forEach((ticket) => {
      if (ticket.checkInAt && ticket.calledAt) {
        waitTimes.push((ticket.calledAt.getTime() - ticket.checkInAt.getTime()) / 60000);
      }
      if (ticket.calledAt && ticket.completedAt) {
        serviceTimes.push((ticket.completedAt.getTime() - ticket.calledAt.getTime()) / 60000);
      }
    });

    const ticketIds = tickets.map((t) => t.id);
    let surveys: Survey[] = [];
    if (ticketIds.length > 0) {
      surveys = await this.surveyRepository.find({
        where: {
          ticketId: In(ticketIds),
          isCompleted: true,
        },
      });
      surveys = surveys.filter((s) => {
        if (!s.submittedAt) return false;
        const t = s.submittedAt.getTime();
        return t >= start.getTime() && t <= end.getTime();
      });
    } else if (
      !filters.serviceId &&
      !filters.serviceCode &&
      !filters.windowNumber &&
      filters.agentId == null
    ) {
      surveys = await this.surveyRepository
        .createQueryBuilder('s')
        .where('s.submittedAt >= :start', { start })
        .andWhere('s.submittedAt <= :end', { end })
        .andWhere('s.isCompleted = true')
        .getMany();
    }

    const avgNPS =
      surveys.length > 0
        ? surveys.reduce((sum, s) => sum + (s.npsScore || 0), 0) / surveys.length
        : 0;
    const avgCSAT =
      surveys.length > 0
        ? surveys.reduce((sum, s) => sum + (s.csatScore || 0), 0) / surveys.length
        : 0;

    const preadsInPeriod = await this.findPreadmissionsForTicketFilters(start, end, filters);

    const byArrivalState: Record<string, number> = {};
    for (const s of Object.values(PreadmissionArrivalState)) {
      byArrivalState[s] = 0;
    }
    for (const p of preadsInPeriod) {
      const key =
        p.arrivalState && byArrivalState[p.arrivalState] !== undefined
          ? p.arrivalState
          : PreadmissionArrivalState.ESPERA_LLEGADA;
      byArrivalState[key] = (byArrivalState[key] || 0) + 1;
    }

    const withConfirm = preadsInPeriod.filter((p) => p.confirmedArrivalAt);
    const avgMinutesToPhysicalArrival =
      withConfirm.length > 0
        ? withConfirm.reduce(
            (sum, p) =>
              sum +
              (p.confirmedArrivalAt!.getTime() - new Date(p.fechapreadmision).getTime()) / 60000,
            0,
          ) / withConfirm.length
        : 0;

    const totalPreads = preadsInPeriod.length;
    const ticketGenerated = byArrivalState[PreadmissionArrivalState.TICKET_GENERADO] || 0;
    const awaiting =
      (byArrivalState[PreadmissionArrivalState.ESPERA_LLEGADA] || 0) +
      (byArrivalState[PreadmissionArrivalState.REGISTRADO] || 0);

    const management = this.buildManagementTables(tickets, start, end);

    return {
      period: {
        start: toIsoUtc(start),
        end: toIsoUtc(end),
        label: management.period_label,
      },
      tickets: {
        total: tickets.length,
        completed: completedTickets.length,
        noShows: noShows.length,
        averageWaitTime:
          waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
        averageServiceTime:
          serviceTimes.length > 0
            ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length
            : 0,
      },
      satisfaction: {
        totalSurveys: surveys.length,
        averageNPS: Math.round(avgNPS * 10) / 10,
        averageCSAT: Math.round(avgCSAT * 10) / 10,
        responseRate:
          completedTickets.length > 0 ? (surveys.length / completedTickets.length) * 100 : 0,
      },
      preadmissions: {
        total: totalPreads,
        byArrivalState,
        awaitingArrival: awaiting,
        ticketGeneratedCount: ticketGenerated,
        ticketGeneratedRatePercent:
          totalPreads > 0 ? Math.round((ticketGenerated / totalPreads) * 1000) / 10 : 0,
        averageMinutesSubmitToPhysicalArrival: Math.round(avgMinutesToPhysicalArrival * 10) / 10,
      },
      management: {
        period_label: management.period_label,
        by_service: management.by_service,
        totals: management.totals,
        ticket_details: management.ticket_details,
        daily_attention: management.daily_attention,
      },
    };
  }

  /** Preadmisiones del período; si hay filtro de servicio LAB/RAD, limita departamento. */
  private async findPreadmissionsForTicketFilters(
    start: Date,
    end: Date,
    filters: TicketReportFilters,
  ): Promise<Preadmission[]> {
    // Ventanilla / agente no aplican a preadmisiones sin ticket llamado.
    if (filters.windowNumber || filters.agentId != null) {
      return [];
    }
    let tipo: string | undefined;
    if (filters.serviceId != null) {
      const svc = await this.serviceRepository.findOne({ where: { id: filters.serviceId } });
      const area = String(svc?.area || svc?.code || '').toUpperCase();
      if (area === 'RAD' || area === 'LAB') tipo = area;
      else if (svc) return [];
    } else if (filters.serviceCode) {
      const code = filters.serviceCode.trim().toUpperCase();
      if (code === 'RAD' || code === 'RD') tipo = 'RAD';
      else if (code === 'LAB' || code === 'LR') tipo = 'LAB';
      else return [];
    }
    return this.getPreadmissionsReport(start, end, tipo, undefined, undefined);
  }

  async getRealTimeReport(filters: TicketReportFilters = {}) {
    const now = new Date();
    const todayYmd = panamaTodayYmd(now);
    const todayStart = panamaDayStart(todayYmd) ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayEnd = panamaDayEnd(todayYmd) ?? now;
    const serviceIds = await this.resolveServiceIds(filters);

    const activeQb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.service', 'service')
      .where('ticket.status IN (:...statuses)', {
        statuses: [
          TicketStatus.CREADO,
          TicketStatus.CHECK_IN,
          TicketStatus.EN_COLA,
          TicketStatus.LLAMADO,
          TicketStatus.EN_ATENCION,
        ],
      });
    this.applyTicketFilters(activeQb, 'ticket', filters, serviceIds);
    const activeTickets = await activeQb.getMany();

    const todayTickets = await this.findTicketsInRange(todayStart, todayEnd, filters);

    const byService: { [key: string]: any } = {};
    const services = await this.serviceRepository.find({ where: { isActive: true } });
    const servicesToShow =
      serviceIds != null ? services.filter((s) => serviceIds.includes(s.id)) : services;

    servicesToShow.forEach((service) => {
      const serviceTickets = activeTickets.filter((t) => t.serviceId === service.id);
      const todayServiceTickets = todayTickets.filter((t) => t.serviceId === service.id);

      byService[service.name] = {
        serviceId: service.id,
        serviceName: service.name,
        serviceCode: service.code,
        ticketPrefix: service.ticketPrefix,
        activeTickets: serviceTickets.length,
        todayTickets: todayServiceTickets.length,
        inQueue: serviceTickets.filter(
          (t) =>
            t.status === TicketStatus.EN_COLA ||
            t.status === TicketStatus.CREADO ||
            t.status === TicketStatus.CHECK_IN,
        ).length,
        inService: serviceTickets.filter(
          (t) => t.status === TicketStatus.EN_ATENCION || t.status === TicketStatus.LLAMADO,
        ).length,
      };
    });

    let todayPreads: Preadmission[] = [];
    if (!filters.windowNumber && filters.agentId == null) {
      todayPreads = await this.findPreadmissionsForTicketFilters(todayStart, todayEnd, filters);
    }
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

  async getEfficiencyReport(
    startDate?: string | null,
    endDate?: string | null,
    filters: TicketReportFilters = {},
  ) {
    const { start, end } = resolveReportDateRange(startDate, endDate, 7);
    const tickets = await this.findTicketsInRange(start, end, filters);

    const isTransferred = (t: Ticket) =>
      t.status === TicketStatus.TRANSFERIDO ||
      Boolean(t.notes?.trim().toLowerCase().startsWith('transferido'));

    const generated = tickets.length;
    const attended = tickets.filter((t) => t.status === TicketStatus.FINALIZADO);
    const noShows = tickets.filter((t) => t.status === TicketStatus.NO_SHOW);
    const transferred = tickets.filter(isTransferred);

    const waitSamples: number[] = [];
    const attentionSamples: number[] = [];
    let slaAttentionMet = 0;
    let slaAttentionEligible = 0;
    let slaWaitMet = 0;
    let slaWaitEligible = 0;

    for (const ticket of tickets) {
      const sla = defaultSlaForService(ticket.service || { estimatedTime: 15 });
      const emittedAt = ticket.createdAt;
      // Espera: emisión → llamado (aplica a llamados / transferidos / finalizados / no-show con llamado)
      if (emittedAt && ticket.calledAt) {
        const waitMin = Math.max(0, (ticket.calledAt.getTime() - emittedAt.getTime()) / 60000);
        const relevant =
          ticket.status === TicketStatus.FINALIZADO ||
          ticket.status === TicketStatus.NO_SHOW ||
          ticket.status === TicketStatus.LLAMADO ||
          ticket.status === TicketStatus.EN_ATENCION ||
          isTransferred(ticket);
        if (relevant) {
          waitSamples.push(waitMin);
          if (
            ticket.status === TicketStatus.FINALIZADO ||
            ticket.status === TicketStatus.NO_SHOW ||
            isTransferred(ticket)
          ) {
            slaWaitEligible++;
            if (waitMin <= sla.wait) slaWaitMet++;
          }
        }
      }

      if (ticket.status === TicketStatus.FINALIZADO) {
        const startAtt = ticket.startedAt || ticket.calledAt;
        const endAtt = ticket.completedAt;
        if (startAtt && endAtt) {
          const attMin = Math.max(0, (endAtt.getTime() - startAtt.getTime()) / 60000);
          attentionSamples.push(attMin);
          slaAttentionEligible++;
          if (attMin <= sla.attention) slaAttentionMet++;
        }
      }
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const maxWait = waitSamples.length > 0 ? Math.max(...waitSamples) : 0;
    const avgWait = avg(waitSamples);
    const avgAttention = avg(attentionSamples);
    const slaPct =
      slaAttentionEligible > 0 ? (slaAttentionMet / slaAttentionEligible) * 100 : 0;
    const slaWaitPct = slaWaitEligible > 0 ? (slaWaitMet / slaWaitEligible) * 100 : 0;

    const agentIds = [
      ...new Set(attended.map((t) => t.calledBy).filter((id): id is number => id != null)),
    ];
    const agents =
      agentIds.length > 0
        ? await this.userRepository.find({
            where: { id: In(agentIds) },
            select: ['id', 'fullName', 'email'],
          })
        : [];
    const agentById = new Map(agents.map((a) => [a.id, a]));

    const byWindow: { [key: string]: any } = {};
    const byAgent: { [key: string]: any } = {};

    attended.forEach((ticket) => {
      const window = (ticket.windowNumber || '').trim() || 'Sin ventanilla';
      if (!byWindow[window]) {
        byWindow[window] = {
          windowNumber: window,
          totalTickets: 0,
          totalServiceTime: 0,
          averageServiceTime: 0,
        };
      }
      byWindow[window].totalTickets++;
      const startAtt = ticket.startedAt || ticket.calledAt;
      if (startAtt && ticket.completedAt) {
        byWindow[window].totalServiceTime +=
          (ticket.completedAt.getTime() - startAtt.getTime()) / 60000;
      }

      const agentKey = ticket.calledBy != null ? String(ticket.calledBy) : 'sin_agente';
      if (!byAgent[agentKey]) {
        const agent = ticket.calledBy != null ? agentById.get(ticket.calledBy) : null;
        byAgent[agentKey] = {
          agentId: ticket.calledBy ?? null,
          agentName: agent?.fullName || agent?.email || 'Sin agente',
          totalTickets: 0,
          totalServiceTime: 0,
          averageServiceTime: 0,
        };
      }
      byAgent[agentKey].totalTickets++;
      if (startAtt && ticket.completedAt) {
        byAgent[agentKey].totalServiceTime +=
          (ticket.completedAt.getTime() - startAtt.getTime()) / 60000;
      }
    });

    Object.keys(byWindow).forEach((window) => {
      const data = byWindow[window];
      data.averageServiceTime =
        data.totalTickets > 0 ? data.totalServiceTime / data.totalTickets : 0;
    });
    Object.keys(byAgent).forEach((key) => {
      const data = byAgent[key];
      data.averageServiceTime =
        data.totalTickets > 0 ? data.totalServiceTime / data.totalTickets : 0;
    });

    const byHour: { [key: number]: number } = {};
    tickets.forEach((ticket) => {
      const hour = getHourInAppTimezone(ticket.createdAt);
      byHour[hour] = (byHour[hour] || 0) + 1;
    });

    return {
      period: {
        start: toIsoUtc(start),
        end: toIsoUtc(end),
      },
      kpis: {
        tickets_generated: generated,
        tickets_attended: attended.length,
        no_shows: noShows.length,
        transferred: transferred.length,
        avg_wait_minutes: Math.round(avgWait * 10) / 10,
        avg_wait_label: this.formatDurationMinutes(avgWait),
        max_wait_minutes: Math.round(maxWait * 10) / 10,
        max_wait_label: this.formatDurationMinutes(maxWait),
        avg_attention_minutes: Math.round(avgAttention * 10) / 10,
        avg_attention_label: this.formatDurationMinutes(avgAttention),
        sla_met_percent: Math.round(slaPct * 10) / 10,
        sla_wait_met_percent: Math.round(slaWaitPct * 10) / 10,
        sla_attention_eligible: slaAttentionEligible,
        sla_attention_met: slaAttentionMet,
      },
      byWindow,
      byAgent,
      byHour,
      totalTickets: generated,
    };
  }

  async getServiceReport(
    serviceId: number,
    startDate?: string | null,
    endDate?: string | null,
    filters: TicketReportFilters = {},
  ) {
    const { start, end } = resolveReportDateRange(startDate, endDate, 30);
    const tickets = await this.findTicketsInRange(start, end, {
      ...filters,
      serviceId,
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
        start: toIsoUtc(start),
        end: toIsoUtc(end),
      },
      totalTickets: tickets.length,
      statusCounts,
    };
  }

  /** Listado de preadmisiones con filtros (fecha, tipo, documento, estado de llegada) */
  async getPreadmissionsReport(
    startDate?: Date | string | null,
    endDate?: Date | string | null,
    tipo?: string,
    documento?: string,
    arrivalState?: PreadmissionArrivalState,
  ): Promise<Preadmission[]> {
    let start: Date;
    let end: Date;
    if (startDate instanceof Date && endDate instanceof Date) {
      start = startDate;
      end = endDate;
    } else {
      const range = resolveReportDateRange(
        typeof startDate === 'string' ? startDate : null,
        typeof endDate === 'string' ? endDate : null,
        30,
      );
      start = range.start;
      end = range.end;
    }

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

  async exportPreadmissionsCSV(
    startDate?: string | null,
    endDate?: string | null,
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
    const escape = (v: unknown) => (v == null ? '' : String(v).replace(/"/g, '""'));
    const cell = (p: Preadmission, h: string) => {
      if (h === 'confirmedArrivalAt' || h === 'fechapreadmision') {
        const d = (p as any)[h] as Date | string | null | undefined;
        if (d == null) return '';
        return d instanceof Date ? d.toISOString() : String(d);
      }
      return (p as any)[h];
    };
    const rows = list.map((p) => headers.map((h) => `"${escape(cell(p, h))}"`).join(','));
    return [headers.join(','), ...rows].join('\r\n');
  }

  async exportPreadmissionsExcel(
    startDate?: string | null,
    endDate?: string | null,
    tipo?: string,
    documento?: string,
    arrivalState?: PreadmissionArrivalState,
  ): Promise<string> {
    const csv = await this.exportPreadmissionsCSV(
      startDate,
      endDate,
      tipo,
      documento,
      arrivalState,
    );
    const rows = csv
      .split(/\r?\n/)
      .map((line) =>
        line.split(',').map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"')),
      );
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
