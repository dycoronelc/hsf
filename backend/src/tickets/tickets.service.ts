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

  private generateTicketNumber(service: Pick<Service, 'code' | 'ticketPrefix'>): string {
    const prefix = service.ticketPrefix || service.code;
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${prefix}-${randomSuffix}`;
  }

  private async resolveLabRadServices(): Promise<{ lab: Service; rad: Service }> {
    const lab =
      (await this.serviceRepository.findOne({ where: { code: 'LAB', isActive: true } })) ||
      (await this.serviceRepository.findOne({ where: { area: 'LAB', isActive: true } }));
    const rad =
      (await this.serviceRepository.findOne({ where: { code: 'RAD', isActive: true } })) ||
      (await this.serviceRepository.findOne({ where: { area: 'RAD', isActive: true } }));
    if (!lab) throw new NotFoundException('No se encontró el servicio de Laboratorio (LAB)');
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
    if (targetArea === 'BOTH') return [lab, rad];
    if (targetArea === 'LAB') return [lab];
    return [rad];
  }

  /** Marca un ticket como proveniente de transferencia (mismo número/código). */
  private buildTransferNotes(params: {
    sourceServiceName: string;
    targetService: Pick<Service, 'name' | 'code'>;
    ticketNumber: string;
  }): string {
    const from = params.sourceServiceName || 'servicio anterior';
    const to = params.targetService.name || params.targetService.code || 'destino';
    return `Transferido a ${to} (desde ${from}); ticket ${params.ticketNumber}`;
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

  /** Clona el ticket hacia otro servicio conservando el mismo número/código. */
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
    // Por ahora el flujo solo llega hasta recepción:
    // - CREADO  => "Solicitado" (aún no ha llegado)
    // - CHECK_IN => "Arribado" (ya llegó a recepción) y NO debe contar "por delante"
    // Cuando agreguemos más estados, podemos volver a incluir EN_COLA/LLAMADO/EN_ATENCION aquí.
    return [TicketStatus.CREADO];
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
      ticketNumber: this.generateTicketNumber(service),
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
        'Solo se permiten turnos de Admisión, Laboratorio o Radiología en recepción',
      );
    }

    const now = new Date();
    const ticket = this.ticketRepository.create({
      ticketNumber: this.generateTicketNumber(service),
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
      ticketNumber: this.generateTicketNumber(service),
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
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.service', 'service');

    if (user.role === 'patient') {
      query.where('ticket.patientId = :patientId', { patientId: user.id });
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
        completed_at: toPanamaOffsetIso(ticket.completedAt),
        qr_code: ticket.qrCode,
        window_number: ticket.windowNumber ?? null,
        call_count: ticket.callCount ?? 0,
        called_at: toPanamaOffsetIso(ticket.calledAt),
        notes: ticket.notes ?? null,
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

  async listOccupiedDestinations(): Promise<{ destinations: string[] }> {
    const rows = await this.ticketRepository.find({
      where: [{ status: TicketStatus.LLAMADO }, { status: TicketStatus.EN_ATENCION }],
      select: ['windowNumber'],
    });
    const destinations = [
      ...new Set(
        rows
          .map((r) => (r.windowNumber || '').trim())
          .filter((w) => w.length > 0),
      ),
    ];
    return { destinations };
  }

  private async assertDestinationAvailable(windowNumber: string, exceptTicketId?: number) {
    const dest = windowNumber.trim();
    if (!dest) {
      throw new BadRequestException('Indique el destino del llamado');
    }
    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.status IN (:...statuses)', {
        statuses: [TicketStatus.LLAMADO, TicketStatus.EN_ATENCION],
      })
      .andWhere('TRIM(ticket.windowNumber) = :dest', { dest });
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
    const { recallWaitSeconds } = await this.settingsService.getCallTimings();
    const elapsed = ticket.calledAt ? (Date.now() - ticket.calledAt.getTime()) / 1000 : 0;
    if (elapsed < recallWaitSeconds) {
      throw new BadRequestException(
        `Espere ${Math.ceil(recallWaitSeconds - elapsed)} segundos antes de volver a llamar`,
      );
    }
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

  async markNoShow(id: number, reason: string, agent: Pick<User, 'id' | 'agentState'>) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
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

  async start(id: number, agent?: Pick<User, 'id' | 'agentState'>) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
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

  async complete(id: number, agent?: Pick<User, 'id' | 'agentState'>) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    ticket.status = TicketStatus.FINALIZADO;
    ticket.completedAt = new Date();
    await this.ticketRepository.save(ticket);
    await this.auditService.log('ticket_completed', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent?.id,
    });
    
    // Crear encuesta automática si el paciente está autenticado
    if (ticket.patientId && ticket.patientId > 0) {
      this.surveysService.createForTicket(ticket.id).catch((error) => {
        console.error('Error creating survey for ticket:', error);
      });
    }
    
    return { message: 'Atención finalizada' };
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

  /** Transferir ticket a Radiología, Laboratorio, Admisión u Urgencias (post-triage).
   * Conserva el mismo número/código del ticket; solo cambia el servicio destino.
   */
  async transfer(id: number, dto: TransferTicketDto, agent?: Pick<User, 'id' | 'agentState'>) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id }, relations: ['service'] });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
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

    // Primer destino: reutiliza el mismo ticket (sin cambiar número/código).
    const primary = targets[0];
    this.resetTicketForTransferQueue(
      ticket,
      primary.id,
      this.buildTransferNotes({
        sourceServiceName,
        targetService: primary,
        ticketNumber: keepNumber,
      }),
    );
    queueTickets.push(await this.ticketRepository.save(ticket));

    // Destinos adicionales (p. ej. BOTH): clona con el mismo número/código.
    for (const target of targets.slice(1)) {
      queueTickets.push(
        await this.createTransferredQueueTicket({
          source: ticket,
          targetService: target,
          sourceServiceName,
        }),
      );
    }

    const createdSummary = queueTickets.map((t) => ({
      id: t.id,
      ticket_number: t.ticketNumber,
      service_id: t.serviceId,
    }));

    await this.auditService.log('ticket_transferred', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent?.id,
      details: `targetArea=${dto.targetArea}; color=${ticket.triageColor ?? ''}; keptNumber=${keepNumber}; queue=${createdSummary
        .map((c) => `${c.ticket_number}@${c.service_id}`)
        .join(',')}`,
    });

    return {
      message:
        dto.targetArea === 'BOTH'
          ? `Ticket ${keepNumber} transferido a ambos servicios (mismo número)`
          : `Ticket ${keepNumber} transferido (mismo número)`,
      original_id: id,
      original_ticket_number: keepNumber,
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
      ticketNumber: this.generateTicketNumber(admService),
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
}
