import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { CreateTicketDto, UpdateTicketDto, TransferTicketDto } from './dto/ticket.dto';
import { TicketStatus, Priority, PreadmissionArrivalState, TriageColor } from '../common/enums';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { SurveysService } from '../surveys/surveys.service';
import { isAgentOperational } from '../common/agent-utils';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { toIsoUtc, toPanamaOffsetIso } from '../common/timezone';

/**
 * ROLLBACK Lab+Rad secuencial:
 * - Tag git previo: `pre-sequential-lab-rad-transfer`
 * - Doc: docs/entrega/ROLLBACK_SEQUENTIAL_LAB_RAD.md
 * - `false` = comportamiento legacy (BOTH clona un 2º ticket con el mismo número).
 */
const SEQUENTIAL_LAB_RAD_TRANSFER = true;

/** Metadato en notes: segunda etapa pendiente tras Lab+Rad secuencial. */
const HSF_PENDING_STAGE_RE = /\[HSF_PENDING_STAGE:(RAD|LAB)\]/;

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Preadmission)
    private preadmissionRepository: Repository<Preadmission>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => SurveysService))
    private surveysService: SurveysService,
    private auditService: AuditService,
    private settingsService: SettingsService,
  ) {}

  /** Número secuencial por prefijo: T-001, OT-002, etc. (orden de llegada por tipo). */
  private async generateTicketNumber(
    service: Pick<Service, 'code' | 'ticketPrefix'>,
  ): Promise<string> {
    const prefix = String(service.ticketPrefix || service.code || 'TK')
      .trim()
      .toUpperCase();
    return this.ticketRepository.manager.transaction(async (em) => {
      // Evita colisiones bajo carga concurrente (kiosco / recepción).
      await em.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`ticket_seq:${prefix}`]);
      // Secuencia diaria (zona Panamá): reinicia en 001 cada día.
      // createdAt = timestamp sin TZ (UTC en BD). Usar timezone('America/Panama', …) en ambos lados;
      // la fórmula (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'America/Panama' desfasa el "hoy" ~5 h.
      const rows: Array<{ max_num: string | number | null }> = await em.query(
        `
        SELECT COALESCE(MAX((regexp_match("ticketNumber", '-(\\d+)$'))[1]::int), 0) AS max_num
        FROM tickets
        WHERE "ticketNumber" ILIKE $1
          AND to_char(timezone('America/Panama', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD')
            = to_char(timezone('America/Panama', now()), 'YYYY-MM-DD')
        `,
        [`${prefix}-%`],
      );
      const max = Number(rows[0]?.max_num ?? 0);
      const next = max + 1;
      return `${prefix}-${String(next).padStart(3, '0')}`;
    });
  }

  /** Solo el agente/destino que llamó puede gestionar el turno. */
  private assertTicketOwnedByAgent(
    ticket: Ticket,
    agent?: Pick<User, 'id'> | null,
    windowNumber?: string | null,
  ) {
    if (!agent?.id) return;
    const dest = (windowNumber || '').trim();
    const ticketDest = (ticket.windowNumber || '').trim();
    const sameAgent = ticket.calledBy != null && ticket.calledBy === agent.id;
    const sameDest = dest && ticketDest && dest === ticketDest;
    if (ticket.calledBy != null && !sameAgent && !sameDest) {
      throw new BadRequestException(
        'Este turno fue llamado desde otro destino. Solo esa ventanilla puede gestionarlo.',
      );
    }
  }

  private async resolveLabRadServices(): Promise<{ lab: Service; rad: Service }> {
    const lab =
      (await this.serviceRepository.findOne({ where: { code: 'LAB', isActive: true } })) ||
      (await this.serviceRepository.findOne({ where: { area: 'LAB', isActive: true } }));
    const rad =
      (await this.serviceRepository.findOne({ where: { code: 'RAD', isActive: true } })) ||
      (await this.serviceRepository.findOne({ where: { area: 'RAD', isActive: true } }));
    if (!lab) throw new NotFoundException('No se encontró el servicio de Toma de muestra (LAB)');
    if (!rad) throw new NotFoundException('No se encontró el servicio de Radiología (RAD)');
    return { lab, rad };
  }

  private async resolveServiceByCodes(codes: string[], label: string): Promise<Service> {
    for (const code of codes) {
      const found = await this.serviceRepository.findOne({
        where: { code, isActive: true },
      });
      if (found) return found;
    }
    throw new BadRequestException(
      `Servicio de ${label} no configurado (códigos: ${codes.join(', ')})`,
    );
  }

  private async resolveTransferTargets(
    targetArea: TransferTicketDto['targetArea'],
  ): Promise<Service[]> {
    if (targetArea === 'ADM') {
      return [await this.resolveServiceByCodes(['ADM', 'CTA'], 'Admisión / Consulta')];
    }
    if (targetArea === 'URG') {
      return [await this.resolveServiceByCodes(['URG'], 'Urgencias')];
    }
    const { lab, rad } = await this.resolveLabRadServices();
    // Secuencial: BOTH = solo primer destino (LAB). Flag off = [lab, rad] para clonado legacy.
    if (targetArea === 'BOTH') {
      return SEQUENTIAL_LAB_RAD_TRANSFER ? [lab] : [lab, rad];
    }
    if (targetArea === 'LAB') return [lab];
    return [rad];
  }

  private parsePendingSecondStage(notes?: string | null): 'RAD' | 'LAB' | null {
    const m = HSF_PENDING_STAGE_RE.exec(notes || '');
    if (!m) return null;
    return m[1] === 'LAB' ? 'LAB' : 'RAD';
  }

  private stripPendingSecondStage(notes?: string | null): string {
    return String(notes || '')
      .replace(HSF_PENDING_STAGE_RE, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private withPendingSecondStage(notes: string, stage: 'RAD' | 'LAB'): string {
    const base = this.stripPendingSecondStage(notes);
    return `${base}\n[HSF_PENDING_STAGE:${stage}]`.trim();
  }

  private isLabOrRadService(service?: Pick<Service, 'code' | 'area' | 'name'> | null): boolean {
    const code = String(service?.code || '').toUpperCase();
    const area = String(service?.area || '').toUpperCase();
    if (code === 'LAB' || code === 'RAD' || area === 'LAB' || area === 'RAD') return true;
    return /radiolog|toma de muestra|laboratorio/i.test(service?.name || '');
  }

  private isVentanillaLikeService(service?: Pick<Service, 'code' | 'area' | 'name'> | null): boolean {
    if (!service) return true;
    if (this.isLabOrRadService(service)) return false;
    const code = String(service.code || '').toUpperCase();
    if (code === 'TRIAGE' || code === 'URG') return false;
    if (/triage|urgenc/i.test(service.name || '')) return false;
    return true;
  }

  private async assertNoActiveDuplicateNumber(
    ticketNumber: string,
    serviceId: number,
    excludeId: number,
  ) {
    const existing = await this.ticketRepository.findOne({
      where: {
        ticketNumber,
        serviceId,
        status: In([
          TicketStatus.CREADO,
          TicketStatus.CHECK_IN,
          TicketStatus.EN_COLA,
          TicketStatus.LLAMADO,
          TicketStatus.EN_ATENCION,
        ]),
      },
    });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(
        `Ya existe el turno ${ticketNumber} activo en ese servicio (evite duplicar Lab+Rad).`,
      );
    }
  }

  /** Marca un ticket como proveniente de transferencia (mismo número/código). */
  private buildTransferNotes(params: {
    sourceServiceName: string;
    targetService: Pick<Service, 'name' | 'code'>;
    ticketNumber: string;
    pendingSecondStage?: 'RAD' | 'LAB' | null;
  }): string {
    const from = params.sourceServiceName || 'servicio anterior';
    const to = params.targetService.name || params.targetService.code || 'destino';
    let notes = `Transferido a ${to} (desde ${from}); ticket ${params.ticketNumber}`;
    if (params.pendingSecondStage) {
      notes = this.withPendingSecondStage(notes, params.pendingSecondStage);
    }
    return notes;
  }

  private resetTicketForTransferQueue(ticket: Ticket, targetServiceId: number, notes: string) {
    ticket.serviceId = targetServiceId;
    ticket.status = ticket.checkInAt ? TicketStatus.CHECK_IN : TicketStatus.CREADO;
    ticket.notes = notes;
    ticket.callCount = 0;
    ticket.windowNumber = null;
    ticket.calledAt = null;
    ticket.calledBy = null;
    ticket.startedAt = null;
    ticket.completedAt = null;
  }

  /**
   * Clona el ticket hacia otro servicio conservando el mismo número/código.
   * Solo se usa si SEQUENTIAL_LAB_RAD_TRANSFER === false (rollback legacy BOTH).
   */
  private async createTransferredQueueTicket(params: {
    source: Ticket;
    targetService: Service;
    sourceServiceName: string;
  }): Promise<Ticket> {
    const notes = this.buildTransferNotes({
      sourceServiceName: params.sourceServiceName,
      targetService: params.targetService,
      ticketNumber: params.source.ticketNumber,
    });
    const created = this.ticketRepository.create({
      ticketNumber: params.source.ticketNumber,
      patientId: params.source.patientId,
      serviceId: params.targetService.id,
      status: params.source.checkInAt ? TicketStatus.CHECK_IN : TicketStatus.CREADO,
      priority: params.source.priority,
      triageColor: params.source.triageColor ?? null,
      qrCode: this.generateQrCode(),
      preadmissionId: params.source.preadmissionId ?? null,
      callCount: 0,
      windowNumber: null,
      calledAt: null,
      calledBy: null,
      startedAt: null,
      completedAt: null,
      checkInAt: params.source.checkInAt ?? null,
      notes,
    });
    return this.ticketRepository.save(created);
  }

  private assertAgentCanOperate(user: Pick<User, 'id' | 'agentState'> | null | undefined) {
    if (!user) return;
    if (!isAgentOperational(user.agentState)) {
      throw new BadRequestException(
        'No puede llamar ni gestionar tickets mientras está en un estado no operativo',
      );
    }
  }

  private generateQrCode(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  private getActiveQueueStatuses(): TicketStatus[] {
    // Cola operativa: solicitados y arribados cuentan para posición / espera.
    return [TicketStatus.CREADO, TicketStatus.CHECK_IN, TicketStatus.EN_COLA];
  }

  private formatElapsedWaitLabel(from: Date | null | undefined): {
    elapsed_wait_seconds: number;
    elapsed_wait_label: string;
  } {
    if (!from) {
      return { elapsed_wait_seconds: 0, elapsed_wait_label: '0h 0m 0s' };
    }
    const waitSeconds = Math.max(0, Math.floor((Date.now() - from.getTime()) / 1000));
    const hours = Math.floor(waitSeconds / 3600);
    const minutes = Math.floor((waitSeconds % 3600) / 60);
    const seconds = waitSeconds % 60;
    return {
      elapsed_wait_seconds: waitSeconds,
      elapsed_wait_label: `${hours}h ${minutes}m ${seconds}s`,
    };
  }

  private async getQueuePositionsByService(serviceId: number): Promise<Map<number, number>> {
    const activeTickets = await this.ticketRepository.find({
      where: { serviceId, status: In(this.getActiveQueueStatuses()) },
      order: { createdAt: 'ASC' },
    });
    const map = new Map<number, number>();
    activeTickets.forEach((t, idx) => map.set(t.id, idx + 1));
    return map;
  }

  private async enrichWithQueueInfo(
    tickets: Array<{ id: number; serviceId: number }>,
  ): Promise<
    Map<
      number,
      {
        queue_position: number;
        ahead_count: number;
        estimated_wait_seconds: number;
        estimated_wait_label: string;
      }
    >
  > {
    const serviceIds = Array.from(new Set(tickets.map((t) => t.serviceId)));
    const services = await this.serviceRepository.findBy({ id: In(serviceIds) });
    const serviceById = new Map(services.map((s) => [s.id, s]));
    const serviceMaps = await Promise.all(
      serviceIds.map(async (sid) => [sid, await this.getQueuePositionsByService(sid)] as const),
    );
    const byService = new Map<number, Map<number, number>>(serviceMaps);

    const out = new Map<
      number,
      {
        queue_position: number;
        ahead_count: number;
        estimated_wait_seconds: number;
        estimated_wait_label: string;
      }
    >();
    for (const t of tickets) {
      const pos = byService.get(t.serviceId)?.get(t.id) ?? 0;
      const ahead = Math.max(0, pos - 1);
      const minutesPerTicket = serviceById.get(t.serviceId)?.estimatedTime ?? 15;
      const waitSeconds = ahead * minutesPerTicket * 60;
      const hours = Math.floor(waitSeconds / 3600);
      const minutes = Math.floor((waitSeconds % 3600) / 60);
      const seconds = waitSeconds % 60;
      const label = `${hours}h ${minutes}m ${seconds}s`;
      out.set(t.id, {
        queue_position: pos,
        ahead_count: ahead,
        estimated_wait_seconds: waitSeconds,
        estimated_wait_label: label,
      });
    }
    return out;
  }

  async createKioskTicket(createDto: CreateTicketDto) {
    // Crear ticket desde kiosco sin autenticación (ticket anónimo)
    const service = await this.serviceRepository.findOne({
      where: { id: createDto.serviceId },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const ticket = this.ticketRepository.create({
      ticketNumber: await this.generateTicketNumber(service),
      patientId: null, // Ticket anónimo desde kiosco
      serviceId: createDto.serviceId,
      priority: createDto.priority || Priority.NORMAL,
      status: TicketStatus.CREADO,
      qrCode: this.generateQrCode(),
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    const queueInfo = await this.enrichWithQueueInfo([{ id: savedTicket.id, serviceId: savedTicket.serviceId }]);
    const qi = queueInfo.get(savedTicket.id) ?? {
      queue_position: 0,
      ahead_count: 0,
      estimated_wait_seconds: 0,
      estimated_wait_label: '0h 0m 0s',
    };

    return {
      id: savedTicket.id,
      ticket_number: savedTicket.ticketNumber,
      service_id: savedTicket.serviceId,
      service_name: service.name,
      status: savedTicket.status,
      priority: savedTicket.priority,
      created_at: toPanamaOffsetIso(savedTicket.createdAt) ?? toIsoUtc(new Date())!,
      qr_code: savedTicket.qrCode,
      ...qi,
    };
  }

  /** Turno walk-in creado por anfitrión en recepción (Lab/Rad, sin registro del paciente). */
  async createHostWalkInTicket(createDto: CreateTicketDto, hostUserId: number) {
    const service = await this.serviceRepository.findOne({
      where: { id: createDto.serviceId, isActive: true },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
    const allowedAreas = ['LAB', 'RAD', 'ADM', 'ADMISION'];
    if (!allowedAreas.includes(String(service.area || '').toUpperCase())) {
      throw new BadRequestException(
        'Solo se permiten turnos de Admisión, Toma de muestra o Radiología en recepción',
      );
    }

    const now = new Date();
    const ticket = this.ticketRepository.create({
      ticketNumber: await this.generateTicketNumber(service),
      patientId: null,
      serviceId: createDto.serviceId,
      priority: createDto.priority || Priority.NORMAL,
      status: TicketStatus.CHECK_IN,
      checkInAt: now,
      qrCode: this.generateQrCode(),
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    const queueInfo = await this.enrichWithQueueInfo([
      { id: savedTicket.id, serviceId: savedTicket.serviceId },
    ]);
    const qi = queueInfo.get(savedTicket.id) ?? {
      queue_position: 0,
      ahead_count: 0,
      estimated_wait_seconds: 0,
      estimated_wait_label: '0h 0m 0s',
    };

    await this.auditService.log('host_walk_in_ticket_created', {
      entityType: 'ticket',
      entityId: savedTicket.id,
      userId: hostUserId,
      details: JSON.stringify({
        ticketNumber: savedTicket.ticketNumber,
        serviceId: service.id,
        serviceCode: service.code,
      }),
    });

    return {
      id: savedTicket.id,
      ticket_number: savedTicket.ticketNumber,
      service_id: savedTicket.serviceId,
      service_name: service.name,
      status: savedTicket.status,
      priority: savedTicket.priority,
      created_at: toPanamaOffsetIso(savedTicket.createdAt) ?? toIsoUtc(new Date())!,
      qr_code: savedTicket.qrCode,
      ...qi,
    };
  }

  async create(createDto: CreateTicketDto, patientId: number) {
    const service = await this.serviceRepository.findOne({
      where: { id: createDto.serviceId },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const ticket = this.ticketRepository.create({
      ticketNumber: await this.generateTicketNumber(service),
      patientId,
      serviceId: createDto.serviceId,
      priority: createDto.priority || Priority.NORMAL,
      status: TicketStatus.CREADO,
      qrCode: this.generateQrCode(),
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    
    // Enviar notificación si el paciente está autenticado
    if (patientId && patientId > 0) {
      this.notificationsService.sendTicketCreated(
        patientId,
        savedTicket.ticketNumber,
        service.name,
        savedTicket.qrCode,
      ).catch((error) => {
        console.error('Error sending ticket notification:', error);
      });
    }
    
    const queueInfo = await this.enrichWithQueueInfo([{ id: savedTicket.id, serviceId: savedTicket.serviceId }]);
    const qi = queueInfo.get(savedTicket.id) ?? {
      queue_position: 0,
      ahead_count: 0,
      estimated_wait_seconds: 0,
      estimated_wait_label: '0h 0m 0s',
    };

    return {
      id: savedTicket.id,
      ticket_number: savedTicket.ticketNumber,
      service_id: savedTicket.serviceId,
      service_name: service.name,
      status: savedTicket.status,
      priority: savedTicket.priority,
      created_at: toPanamaOffsetIso(savedTicket.createdAt) ?? toIsoUtc(new Date())!,
      qr_code: savedTicket.qrCode,
      ...qi,
    };
  }

  async findAll(user: User, serviceId?: number, status?: TicketStatus) {
    await this.releaseStalePriorDayActiveTickets();
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.service', 'service');

    if (user.role === 'patient') {
      query.where('ticket.patientId = :patientId', { patientId: user.id });
    } else {
      // Consola staff / ops: solo día calendario Panamá (evita cargar histórico completo cada poll).
      query.andWhere(
        `to_char(timezone('America/Panama', ticket.createdAt AT TIME ZONE 'UTC'), 'YYYY-MM-DD')
         = to_char(timezone('America/Panama', now()), 'YYYY-MM-DD')`,
      );
    }

    if (serviceId) {
      query.andWhere('ticket.serviceId = :serviceId', { serviceId });
    }

    if (status) {
      query.andWhere('ticket.status = :status', { status });
    }

    const tickets = await query.getMany();
    const queueInfo = await this.enrichWithQueueInfo(
      tickets.map((t) => ({ id: t.id, serviceId: t.serviceId })),
    );

    return tickets.map((ticket) => {
      const qi = queueInfo.get(ticket.id) ?? {
        queue_position: 0,
        ahead_count: 0,
        estimated_wait_seconds: 0,
        estimated_wait_label: '0h 0m 0s',
      };
      return {
        id: ticket.id,
        ticket_number: ticket.ticketNumber,
        service_id: ticket.serviceId,
        service_name: ticket.service?.name,
        service_code: ticket.service?.code ?? null,
        status: ticket.status,
        priority: ticket.priority,
        priority_level: ticket.service?.priorityLevel ?? 2,
        triage_color: ticket.triageColor ?? null,
        created_at: toPanamaOffsetIso(ticket.createdAt) ?? toIsoUtc(new Date())!,
        check_in_at: toPanamaOffsetIso(ticket.checkInAt),
        completed_at: toPanamaOffsetIso(ticket.completedAt),
        qr_code: ticket.qrCode,
        window_number: ticket.windowNumber ?? null,
        call_count: ticket.callCount ?? 0,
        called_at: toPanamaOffsetIso(ticket.calledAt),
        called_by: ticket.calledBy ?? null,
        notes: ticket.notes ?? null,
        pending_second_stage: this.parsePendingSecondStage(ticket.notes),
        ...this.formatElapsedWaitLabel(ticket.checkInAt ?? ticket.createdAt),
        ...qi,
      };
    });
  }

  async checkIn(id: number) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    ticket.status = TicketStatus.CHECK_IN;
    ticket.checkInAt = new Date();
    await this.ticketRepository.save(ticket);
    return { message: 'Check-in realizado', ticket_number: ticket.ticketNumber };
  }

  /** Check-in por ID numérico o por código QR (hex). Busca primero en tickets, luego en preadmisiones. */
  async checkInByCode(code: string) {
    const trimmed = code.trim();
    let ticket: Ticket | null = null;
    let preadmission: Preadmission | null = null;
    
    // Buscar ticket por ID o QR
    if (/^\d+$/.test(trimmed)) {
      ticket = await this.ticketRepository.findOne({ where: { id: +trimmed } });
    } else {
      ticket = await this.ticketRepository.findOne({ where: { qrCode: trimmed } });
    }
    
    // Si no se encontró ticket, buscar preadmisión
    if (!ticket) {
      if (/^\d+$/.test(trimmed)) {
        preadmission = await this.preadmissionRepository.findOne({ where: { id: +trimmed } });
      } else {
        preadmission = await this.preadmissionRepository.findOne({ where: { qrCode: trimmed } });
      }
    }
    
    if (ticket) {
      ticket.status = TicketStatus.CHECK_IN;
      ticket.checkInAt = new Date();
      await this.ticketRepository.save(ticket);
      const queueInfo = await this.enrichWithQueueInfo([{ id: ticket.id, serviceId: ticket.serviceId }]);
      const qi = queueInfo.get(ticket.id) ?? {
        queue_position: 0,
        ahead_count: 0,
        estimated_wait_seconds: 0,
        estimated_wait_label: '0h 0m 0s',
      };
      return {
        message: 'Llegada registrada',
        type: 'ticket',
        ticket_number: ticket.ticketNumber,
        service_id: ticket.serviceId,
        ...qi,
        status: ticket.status,
      };
    }
    
    if (preadmission) {
      preadmission.checkInAt = new Date();
      if (
        preadmission.arrivalState === PreadmissionArrivalState.ESPERA_LLEGADA ||
        preadmission.arrivalState === PreadmissionArrivalState.REGISTRADO
      ) {
        preadmission.arrivalState = PreadmissionArrivalState.PACIENTE_PRESENTE;
        preadmission.confirmedArrivalAt = new Date();
      }
      await this.preadmissionRepository.save(preadmission);
      const nombre = `${preadmission.name1} ${preadmission.apellido1}`.trim();
      return { 
        message: 'Llegada registrada', 
        preadmission_id: preadmission.id,
        paciente: nombre,
        departamento: preadmission.departamento,
        type: 'preadmission' 
      };
    }
    
    throw new NotFoundException('Turno o preadmisión no encontrado con ese código o ID');
  }

  async listOccupiedDestinations(): Promise<{
    destinations: string[];
    items: Array<{
      destination: string;
      ticket_id: number;
      ticket_number: string;
      status: string;
    }>;
  }> {
    await this.releaseStalePriorDayActiveTickets();
    const rows = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select(['ticket.id', 'ticket.windowNumber', 'ticket.ticketNumber', 'ticket.status'])
      .where('ticket.status IN (:...statuses)', {
        statuses: [TicketStatus.LLAMADO, TicketStatus.EN_ATENCION],
      })
      .andWhere(
        `to_char(timezone('America/Panama', COALESCE(ticket.calledAt, ticket.createdAt) AT TIME ZONE 'UTC'), 'YYYY-MM-DD')
         = to_char(timezone('America/Panama', now()), 'YYYY-MM-DD')`,
      )
      .getMany();
    const items = rows
      .map((r) => ({
        destination: (r.windowNumber || '').trim(),
        ticket_id: r.id,
        ticket_number: r.ticketNumber,
        status: r.status,
      }))
      .filter((i) => i.destination.length > 0);
    const destinations = [...new Set(items.map((i) => i.destination))];
    return { destinations, items };
  }

  /**
   * Turnos en llamado/en atención de un día anterior (Panamá) no deben
   * bloquear destinos ni aparecer en el monitor. Se marcan no_show y se liberan.
   * Throttle: como máximo una pasada por minuto (polls de staff/monitor).
   */
  private staleReleaseLastRunMs = 0;

  async releaseStalePriorDayActiveTickets(): Promise<{ released: number; tickets: string[] }> {
    const now = Date.now();
    if (now - this.staleReleaseLastRunMs < 60_000) {
      return { released: 0, tickets: [] };
    }
    this.staleReleaseLastRunMs = now;

    const stale = await this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.status IN (:...statuses)', {
        statuses: [TicketStatus.LLAMADO, TicketStatus.EN_ATENCION],
      })
      .andWhere(
        `to_char(timezone('America/Panama', COALESCE(ticket.calledAt, ticket.createdAt) AT TIME ZONE 'UTC'), 'YYYY-MM-DD')
         < to_char(timezone('America/Panama', now()), 'YYYY-MM-DD')`,
      )
      .getMany();

    if (!stale.length) {
      return { released: 0, tickets: [] };
    }

    const numbers: string[] = [];
    for (const ticket of stale) {
      numbers.push(ticket.ticketNumber);
      const note =
        'Liberado automáticamente: turno activo de un día anterior (cambio de día América/Panama)';
      ticket.notes = ticket.notes?.trim()
        ? `${ticket.notes.trim()}; ${note}`
        : note;
      ticket.status = TicketStatus.NO_SHOW;
      ticket.windowNumber = null;
      ticket.calledAt = null;
      ticket.calledBy = null;
      ticket.startedAt = null;
      ticket.callCount = 0;
      ticket.completedAt = new Date();
      await this.ticketRepository.save(ticket);
    }

    await this.auditService.log('stale_prior_day_tickets_released', {
      entityType: 'ticket',
      entityId: stale[0]?.id,
      details: `tickets=${numbers.join(',')}; count=${numbers.length}`,
      module: 'tickets',
    });

    return { released: numbers.length, tickets: numbers };
  }

  /** Devuelve a cola los turnos activos del agente (p. ej. cierre de sesión o expiración). */
  private async releaseTicketsToQueue(tickets: Ticket[]): Promise<string[]> {
    const numbers: string[] = [];
    for (const ticket of tickets) {
      numbers.push(ticket.ticketNumber);
      ticket.windowNumber = null;
      ticket.calledAt = null;
      ticket.calledBy = null;
      ticket.startedAt = null;
      ticket.callCount = 0;
      ticket.status = ticket.checkInAt ? TicketStatus.CHECK_IN : TicketStatus.CREADO;
      await this.ticketRepository.save(ticket);
    }
    return numbers;
  }

  async releaseAgentSession(agentId: number): Promise<{ released: number; tickets: string[] }> {
    const active = await this.ticketRepository.find({
      where: {
        calledBy: agentId,
        status: In([TicketStatus.LLAMADO, TicketStatus.EN_ATENCION]),
      },
    });
    if (!active.length) {
      return { released: 0, tickets: [] };
    }
    const numbers = await this.releaseTicketsToQueue(active);
    await this.auditService.log('agent_session_released', {
      entityType: 'user',
      entityId: agentId,
      userId: agentId,
      details: `tickets=${numbers.join(',')}`,
    });
    return { released: numbers.length, tickets: numbers };
  }

  /** Libera un destino bloqueado (Administración). */
  async releaseDestination(
    windowNumber: string,
    actor: Pick<User, 'id' | 'role'>,
  ): Promise<{ released: number; tickets: string[] }> {
    const role = String(actor.role || '').toLowerCase();
    if (role !== 'admin') {
      throw new BadRequestException('Solo un administrador puede liberar un destino');
    }
    const dest = windowNumber.trim();
    if (!dest) {
      throw new BadRequestException('Indique el destino a liberar');
    }
    const active = await this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.status IN (:...statuses)', {
        statuses: [TicketStatus.LLAMADO, TicketStatus.EN_ATENCION],
      })
      .andWhere('TRIM(ticket.windowNumber) = :dest', { dest })
      .getMany();
    if (!active.length) {
      return { released: 0, tickets: [] };
    }
    const numbers = await this.releaseTicketsToQueue(active);
    await this.auditService.log('destination_released', {
      entityType: 'ticket',
      entityId: active[0]?.id,
      userId: actor.id,
      details: `dest=${dest}; tickets=${numbers.join(',')}`,
    });
    return { released: numbers.length, tickets: numbers };
  }

  /** Radiología / Toma de muestra permiten varios llamados concurrentes. */
  private isMultiSlotDestination(dest: string): boolean {
    const d = dest.trim();
    return d === 'Radiología' || d === 'Toma de muestra' || d === 'Laboratorio';
  }

  private isTransferOnlyDestination(dest: string): boolean {
    return this.isMultiSlotDestination(dest);
  }

  private isTransferOriginTicket(ticket: Pick<Ticket, 'notes'>): boolean {
    return Boolean(ticket.notes?.startsWith('Transferido'));
  }

  private assertTransferEligibleForDestination(
    windowNumber: string,
    ticket: Pick<Ticket, 'notes' | 'ticketNumber'>,
  ) {
    if (!this.isTransferOnlyDestination(windowNumber)) return;
    if (!this.isTransferOriginTicket(ticket)) {
      throw new BadRequestException(
        `En «${windowNumber.trim()}» solo se pueden llamar tickets transferidos (turno ${ticket.ticketNumber}).`,
      );
    }
  }

  private async assertDestinationAvailable(windowNumber: string, exceptTicketId?: number) {
    const dest = windowNumber.trim();
    if (!dest) {
      throw new BadRequestException('Indique el destino del llamado');
    }
    // Multi-puesto: Radiología / Toma de muestra no bloquean por ocupación.
    if (this.isMultiSlotDestination(dest)) {
      return;
    }
    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.status IN (:...statuses)', {
        statuses: [TicketStatus.LLAMADO, TicketStatus.EN_ATENCION],
      })
      .andWhere('TRIM(ticket.windowNumber) = :dest', { dest })
      .andWhere(
        `to_char(timezone('America/Panama', COALESCE(ticket.calledAt, ticket.createdAt) AT TIME ZONE 'UTC'), 'YYYY-MM-DD')
         = to_char(timezone('America/Panama', now()), 'YYYY-MM-DD')`,
      );
    if (exceptTicketId != null) {
      qb.andWhere('ticket.id != :exceptTicketId', { exceptTicketId });
    }
    const conflict = await qb.getOne();
    if (conflict) {
      throw new BadRequestException(
        `El destino «${dest}» está ocupado con otro turno. Elija otro destino o espere a que finalice.`,
      );
    }
  }

  async call(id: number, windowNumber: string, agent: Pick<User, 'id' | 'agentState'>) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    this.assertTransferEligibleForDestination(windowNumber, ticket);
    await this.assertDestinationAvailable(windowNumber, ticket.id);
    ticket.status = TicketStatus.LLAMADO;
    ticket.calledAt = new Date();
    ticket.calledBy = agent.id;
    ticket.windowNumber = windowNumber.trim();
    ticket.callCount = (ticket.callCount ?? 0) + 1;
    await this.ticketRepository.save(ticket);
    await this.auditService.log('ticket_called', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent.id,
      details: `window=${windowNumber}`,
    });
    
    // Enviar notificación si el paciente está autenticado
    if (ticket.patientId && ticket.patientId > 0) {
      this.notificationsService.sendTicketCalled(
        ticket.patientId,
        ticket.ticketNumber,
        windowNumber,
      ).catch((error) => {
        console.error('Error sending ticket called notification:', error);
      });
    }
    
    return { message: 'Ticket llamado', ticket_number: ticket.ticketNumber, call_count: ticket.callCount };
  }

  async recall(id: number, windowNumber: string, agent: Pick<User, 'id' | 'agentState'>) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    if (ticket.status !== TicketStatus.LLAMADO) {
      throw new BadRequestException('Solo se puede volver a llamar un turno en estado Llamado');
    }
    if ((ticket.callCount ?? 0) < 1) {
      throw new BadRequestException('Debe llamar al paciente al menos una vez antes de volver a llamar');
    }
    this.assertTicketOwnedByAgent(ticket, agent, windowNumber);
    const { recallWaitSeconds } = await this.settingsService.getCallTimings();
    const elapsed = ticket.calledAt ? (Date.now() - ticket.calledAt.getTime()) / 1000 : 0;
    if (elapsed < recallWaitSeconds) {
      throw new BadRequestException(
        `Espere ${Math.ceil(recallWaitSeconds - elapsed)} segundos antes de volver a llamar`,
      );
    }
    this.assertTransferEligibleForDestination(windowNumber, ticket);
    await this.assertDestinationAvailable(windowNumber, ticket.id);
    ticket.status = TicketStatus.LLAMADO;
    ticket.calledAt = new Date();
    ticket.calledBy = agent.id;
    ticket.windowNumber = windowNumber.trim();
    ticket.callCount = (ticket.callCount ?? 0) + 1;
    await this.ticketRepository.save(ticket);
    await this.auditService.log('ticket_recalled', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent.id,
      details: `window=${windowNumber}`,
    });
    return { message: 'Turno re-llamado', ticket_number: ticket.ticketNumber, call_count: ticket.callCount };
  }

  async markNoShow(
    id: number,
    reason: string,
    agent: Pick<User, 'id' | 'agentState'>,
    windowNumber?: string,
  ) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    this.assertTicketOwnedByAgent(ticket, agent, windowNumber);
    if (ticket.status !== TicketStatus.LLAMADO) {
      throw new BadRequestException('Solo se puede marcar no presentado un turno que fue llamado');
    }
    if ((ticket.callCount ?? 0) < 2) {
      throw new BadRequestException('Debe llamar al paciente al menos dos veces antes de marcar no presentado');
    }
    const { noShowWaitSeconds } = await this.settingsService.getCallTimings();
    const elapsed = ticket.calledAt ? (Date.now() - ticket.calledAt.getTime()) / 1000 : 0;
    if (elapsed < noShowWaitSeconds) {
      throw new BadRequestException(
        `Espere ${Math.ceil(noShowWaitSeconds - elapsed)} segundos antes de marcar no presentado`,
      );
    }
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new BadRequestException('Indique el motivo de no presentación');
    }
    ticket.status = TicketStatus.NO_SHOW;
    ticket.notes = trimmed;
    ticket.completedAt = new Date();
    await this.ticketRepository.save(ticket);
    await this.auditService.log('ticket_no_show', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent.id,
      details: trimmed,
    });
    return { message: 'Marcado como no se presentó', ticket_number: ticket.ticketNumber };
  }

  async start(id: number, agent?: Pick<User, 'id' | 'agentState'>, windowNumber?: string) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    this.assertTicketOwnedByAgent(ticket, agent, windowNumber);
    ticket.status = TicketStatus.EN_ATENCION;
    ticket.startedAt = new Date();
    await this.ticketRepository.save(ticket);
    await this.auditService.log('ticket_started', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent?.id,
    });
    return { message: 'Atención iniciada' };
  }

  async complete(id: number, agent?: Pick<User, 'id' | 'agentState'>, windowNumber?: string) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id }, relations: ['service'] });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    this.assertTicketOwnedByAgent(ticket, agent, windowNumber);

    const pendingBefore = this.parsePendingSecondStage(ticket.notes);
    // Si finalizan sin enviar a la 2ª etapa, limpiar marcador.
    if (pendingBefore) {
      ticket.notes = this.stripPendingSecondStage(ticket.notes) || null;
    }

    ticket.status = TicketStatus.FINALIZADO;
    ticket.completedAt = new Date();
    await this.ticketRepository.save(ticket);
    await this.auditService.log('ticket_completed', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent?.id,
      details: pendingBefore ? `cleared_pending_stage=${pendingBefore}` : undefined,
    });

    // Crear encuesta automática si el paciente está autenticado
    if (ticket.patientId && ticket.patientId > 0) {
      this.surveysService.createForTicket(ticket.id).catch((error) => {
        console.error('Error creating survey for ticket:', error);
      });
    }

    const suggest =
      SEQUENTIAL_LAB_RAD_TRANSFER && pendingBefore
        ? {
            targetArea: pendingBefore,
            label:
              pendingBefore === 'RAD'
                ? 'Radiología'
                : 'Toma de muestra',
            hint: 'Había una segunda etapa pendiente (Lab+Rad secuencial). El turno se finalizó sin transferir.',
          }
        : null;

    return {
      message: 'Atención finalizada',
      ticket_id: ticket.id,
      ticket_number: ticket.ticketNumber,
      pending_second_stage_cleared: pendingBefore,
      // La UI pregunta ANTES de completar; este campo es informativo si ya se completó.
      suggest_next_transfer: suggest,
      offer_lab_rad_menu:
        SEQUENTIAL_LAB_RAD_TRANSFER && this.isVentanillaLikeService(ticket.service),
    };
  }

  async update(id: number, updateDto: UpdateTicketDto) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    if (updateDto.status) ticket.status = updateDto.status;
    if (updateDto.windowNumber) ticket.windowNumber = updateDto.windowNumber;
    if (updateDto.notes) ticket.notes = updateDto.notes;

    const savedTicket = await this.ticketRepository.save(ticket);
    const service = await this.serviceRepository.findOne({
      where: { id: savedTicket.serviceId },
    });

    return {
      id: savedTicket.id,
      ticket_number: savedTicket.ticketNumber,
      service_id: savedTicket.serviceId,
      service_name: service?.name,
      status: savedTicket.status,
      priority: savedTicket.priority,
      created_at: toPanamaOffsetIso(savedTicket.createdAt) ?? toIsoUtc(new Date())!,
      qr_code: savedTicket.qrCode,
    };
  }

  /** Transferir ticket a Radiología, Toma de muestra, Admisión u Urgencias (post-triage).
   * Conserva el mismo número/código del ticket; solo cambia el servicio destino.
   * Lab+Rad secuencial (SEQUENTIAL_LAB_RAD_TRANSFER): un solo ticket → LAB + pending RAD.
   */
  async transfer(id: number, dto: TransferTicketDto, agent?: Pick<User, 'id' | 'agentState'>) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id }, relations: ['service'] });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    this.assertTicketOwnedByAgent(ticket, agent, null);
    if (
      ticket.status === TicketStatus.FINALIZADO ||
      ticket.status === TicketStatus.CANCELADO ||
      ticket.status === TicketStatus.NO_SHOW ||
      ticket.status === TicketStatus.TRANSFERIDO
    ) {
      throw new BadRequestException('Este ticket ya no se puede transferir');
    }

    const isTriageSource =
      (ticket.service?.code || '').toUpperCase() === 'TRIAGE' ||
      /triage/i.test(ticket.service?.name || '');
    if (isTriageSource && (dto.targetArea === 'ADM' || dto.targetArea === 'URG') && !ticket.triageColor) {
      throw new BadRequestException(
        'Asigne el color de triage antes de transferir a Admisión u Urgencias',
      );
    }

    const targets = await this.resolveTransferTargets(dto.targetArea);
    const sourceServiceName = ticket.service?.name || ticket.service?.code || 'servicio anterior';
    const keepNumber = ticket.ticketNumber;
    const queueTickets: Ticket[] = [];

    const sequentialBoth = SEQUENTIAL_LAB_RAD_TRANSFER && dto.targetArea === 'BOTH';
    const pendingSecondStage: 'RAD' | 'LAB' | null = sequentialBoth ? 'RAD' : null;

    // Primer destino: reutiliza el mismo ticket (sin cambiar número/código).
    const primary = targets[0];
    await this.assertNoActiveDuplicateNumber(keepNumber, primary.id, ticket.id);

    let notes = this.buildTransferNotes({
      sourceServiceName,
      targetService: primary,
      ticketNumber: keepNumber,
      pendingSecondStage,
    });
    // Si transfieren explícitamente a la etapa pendiente, limpiar marcador.
    if (
      !pendingSecondStage &&
      ((dto.targetArea === 'RAD' && this.parsePendingSecondStage(ticket.notes) === 'RAD') ||
        (dto.targetArea === 'LAB' && this.parsePendingSecondStage(ticket.notes) === 'LAB'))
    ) {
      notes = this.stripPendingSecondStage(notes);
    }

    this.resetTicketForTransferQueue(ticket, primary.id, notes);
    queueTickets.push(await this.ticketRepository.save(ticket));

    // Destinos adicionales solo en modo legacy (clonado BOTH).
    if (!SEQUENTIAL_LAB_RAD_TRANSFER) {
      for (const target of targets.slice(1)) {
        queueTickets.push(
          await this.createTransferredQueueTicket({
            source: ticket,
            targetService: target,
            sourceServiceName,
          }),
        );
      }
    }

    const createdSummary = queueTickets.map((t) => ({
      id: t.id,
      ticket_number: t.ticketNumber,
      service_id: t.serviceId,
      pending_second_stage: this.parsePendingSecondStage(t.notes),
    }));

    await this.auditService.log('ticket_transferred', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent?.id,
      details: `targetArea=${dto.targetArea}; sequential=${sequentialBoth}; color=${ticket.triageColor ?? ''}; keptNumber=${keepNumber}; queue=${createdSummary
        .map((c) => `${c.ticket_number}@${c.service_id}`)
        .join(',')}`,
    });

    return {
      message: sequentialBoth
        ? `Ticket ${keepNumber} enviado a Toma de muestra (secuencia Lab→Rad; mismo número)`
        : dto.targetArea === 'BOTH' && !SEQUENTIAL_LAB_RAD_TRANSFER
          ? `Ticket ${keepNumber} transferido a ambos servicios (mismo número)`
          : `Ticket ${keepNumber} transferido (mismo número)`,
      original_id: id,
      original_ticket_number: keepNumber,
      sequential_lab_rad: sequentialBoth,
      pending_second_stage: pendingSecondStage,
      created_tickets: createdSummary,
    };
  }

  /** Asigna color de triage (enfermería) tras evaluación. */
  async setTriageColor(
    id: number,
    triageColor: TriageColor,
    agent?: Pick<User, 'id' | 'agentState'>,
  ) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id }, relations: ['service'] });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    const isTriage =
      (ticket.service?.code || '').toUpperCase() === 'TRIAGE' ||
      /triage/i.test(ticket.service?.name || '');
    if (!isTriage) {
      throw new BadRequestException('Solo se asigna color a tickets del servicio Triage');
    }
    if (
      ticket.status !== TicketStatus.LLAMADO &&
      ticket.status !== TicketStatus.EN_ATENCION
    ) {
      throw new BadRequestException(
        'El color se asigna cuando el paciente está llamado o en atención de Triage',
      );
    }

    ticket.triageColor = triageColor;
    await this.ticketRepository.save(ticket);
    await this.auditService.log('ticket_triage_color_set', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent?.id,
      details: `color=${triageColor}`,
    });

    return {
      id: ticket.id,
      ticket_number: ticket.ticketNumber,
      triage_color: ticket.triageColor,
      message: `Color de triage asignado: ${triageColor}`,
    };
  }

  /** Cola de admisión (servicio ADM) desde preadmisión con paciente presente (PDF requisitos). */
  async createTicketForPreadmission(preadmissionId: number) {
    const pre = await this.preadmissionRepository.findOne({ where: { id: preadmissionId } });
    if (!pre) {
      throw new NotFoundException('Preadmisión no encontrada');
    }
    if (pre.arrivalState !== PreadmissionArrivalState.PACIENTE_PRESENTE) {
      throw new BadRequestException('El paciente debe estar marcado como presente');
    }
    if (pre.ticketId) {
      throw new BadRequestException('Ya existe un ticket asociado a esta preadmisión');
    }

    const admService = await this.serviceRepository.findOne({
      where: { code: 'ADM', isActive: true },
    });
    if (!admService) {
      throw new NotFoundException('Servicio de Admisión (ADM) no configurado');
    }

    const ticket = this.ticketRepository.create({
      ticketNumber: await this.generateTicketNumber(admService),
      patientId: pre.patientId ?? null,
      serviceId: admService.id,
      priority: Priority.NORMAL,
      status: TicketStatus.CHECK_IN,
      qrCode: this.generateQrCode(),
      preadmissionId: pre.id,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    pre.ticketId = savedTicket.id;
    pre.arrivalState = PreadmissionArrivalState.TICKET_GENERADO;
    await this.preadmissionRepository.save(pre);

    const queueInfo = await this.enrichWithQueueInfo([{ id: savedTicket.id, serviceId: savedTicket.serviceId }]);
    const qi = queueInfo.get(savedTicket.id) ?? {
      queue_position: 0,
      ahead_count: 0,
      estimated_wait_seconds: 0,
      estimated_wait_label: '0h 0m 0s',
    };

    return {
      id: savedTicket.id,
      ticket_number: savedTicket.ticketNumber,
      service_id: savedTicket.serviceId,
      service_name: admService.name,
      status: savedTicket.status,
      priority: savedTicket.priority,
      created_at: toPanamaOffsetIso(savedTicket.createdAt) ?? toIsoUtc(new Date())!,
      qr_code: savedTicket.qrCode,
      preadmission_id: pre.id,
      ...qi,
    };
  }

  /**
   * Vincula un ticket ya generado (p. ej. walk-in Host) a una preadmisión
   * en estado Paciente presente (solicitud hospital 12-sep-2026).
   */
  async associateTicketToPreadmission(
    preadmissionId: number,
    opts: { ticketId?: number; ticketNumber?: string },
    actorId?: number,
  ) {
    const pre = await this.preadmissionRepository.findOne({ where: { id: preadmissionId } });
    if (!pre) {
      throw new NotFoundException('Preadmisión no encontrada');
    }
    if (pre.ticketId) {
      throw new BadRequestException('Ya existe un ticket asociado a esta preadmisión');
    }
    if (pre.arrivalState !== PreadmissionArrivalState.PACIENTE_PRESENTE) {
      throw new BadRequestException(
        'Solo se puede asociar un ticket cuando el estado de llegada es Paciente presente',
      );
    }

    const rawNumber = opts.ticketNumber?.trim();
    let ticket: Ticket | null = null;
    if (opts.ticketId != null && Number.isFinite(opts.ticketId)) {
      ticket = await this.ticketRepository.findOne({
        where: { id: opts.ticketId },
        relations: ['service'],
      });
    }
    if (!ticket && rawNumber) {
      ticket = await this.ticketRepository.findOne({
        where: { ticketNumber: rawNumber },
        relations: ['service'],
      });
      if (!ticket) {
        ticket = await this.ticketRepository.findOne({
          where: { ticketNumber: rawNumber.toUpperCase() },
          relations: ['service'],
        });
      }
    }
    if (!ticket && opts.ticketId == null && !rawNumber) {
      throw new BadRequestException('Indique el ID o el número del ticket a asociar');
    }

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    if (ticket.preadmissionId) {
      throw new BadRequestException(
        `El ticket ${ticket.ticketNumber} ya está vinculado a otra preadmisión`,
      );
    }
    if (
      ticket.status === TicketStatus.CANCELADO ||
      ticket.status === TicketStatus.FINALIZADO
    ) {
      throw new BadRequestException(
        `No se puede asociar un ticket en estado ${ticket.status}`,
      );
    }

    ticket.preadmissionId = pre.id;
    if (pre.patientId && !ticket.patientId) {
      ticket.patientId = pre.patientId;
    }
    await this.ticketRepository.save(ticket);

    pre.ticketId = ticket.id;
    pre.arrivalState = PreadmissionArrivalState.TICKET_GENERADO;
    await this.preadmissionRepository.save(pre);

    await this.auditService.log('ticket_associated_to_preadmission', {
      entityType: 'preadmission',
      entityId: pre.id,
      userId: actorId,
      details: `ticketId=${ticket.id}; ticketNumber=${ticket.ticketNumber}`,
      module: 'preadmission',
    });

    return {
      id: ticket.id,
      ticket_number: ticket.ticketNumber,
      service_id: ticket.serviceId,
      service_name: ticket.service?.name ?? null,
      status: ticket.status,
      preadmission_id: pre.id,
      arrival_state: pre.arrivalState,
      message: `Ticket ${ticket.ticketNumber} asociado a la preadmisión #${pre.id}`,
    };
  }
}
