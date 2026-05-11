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
import { TicketStatus, Priority, PreadmissionArrivalState } from '../common/enums';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { SurveysService } from '../surveys/surveys.service';
import { isAgentOperational } from '../common/agent-utils';
import { AuditService } from '../audit/audit.service';

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
  ) {}

  private generateTicketNumber(service: Pick<Service, 'code' | 'ticketPrefix'>): string {
    const prefix = service.ticketPrefix || service.code;
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${prefix}-${randomSuffix}`;
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
      created_at: savedTicket.createdAt,
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
      created_at: savedTicket.createdAt,
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
        status: ticket.status,
        priority: ticket.priority,
        priority_level: ticket.service?.priorityLevel ?? 2,
        created_at: ticket.createdAt,
        qr_code: ticket.qrCode,
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

  async call(id: number, windowNumber: string, agent: Pick<User, 'id' | 'agentState'>) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    ticket.status = TicketStatus.LLAMADO;
    ticket.calledAt = new Date();
    ticket.calledBy = agent.id;
    ticket.windowNumber = windowNumber;
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
    
    return { message: 'Ticket llamado', ticket_number: ticket.ticketNumber };
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
      created_at: savedTicket.createdAt,
      qr_code: savedTicket.qrCode,
    };
  }

  /** Transferir ticket a Radiología, Laboratorio o Ambos (documento Preadmision.md) */
  async transfer(id: number, dto: TransferTicketDto, agent?: Pick<User, 'id' | 'agentState'>) {
    this.assertAgentCanOperate(agent);
    const ticket = await this.ticketRepository.findOne({ where: { id }, relations: ['service'] });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    const radService = await this.serviceRepository.findOne({ where: { area: 'RAD', isActive: true } });
    const labService = await this.serviceRepository.findOne({ where: { area: 'LAB', isActive: true } });

    if (dto.targetArea === 'BOTH') {
      const otherArea = ticket.service?.area === 'RAD' ? labService : radService;
      if (!otherArea) {
        throw new NotFoundException('No se encontró servicio para el área adicional');
      }
      const newTicket = this.ticketRepository.create({
        ticketNumber: this.generateTicketNumber(otherArea),
        patientId: ticket.patientId,
        serviceId: otherArea.id,
        status: TicketStatus.CREADO,
        priority: ticket.priority,
        qrCode: this.generateQrCode(),
      });
      await this.ticketRepository.save(newTicket);
      await this.auditService.log('ticket_transferred', {
        entityType: 'ticket',
        entityId: ticket.id,
        userId: agent?.id,
        details: `targetArea=${dto.targetArea}`,
      });
      return { message: 'Ticket duplicado para ambos servicios', originalId: id, newTicketId: newTicket.id };
    }

    const targetService = dto.targetArea === 'RAD' ? radService : labService;
    if (!targetService) {
      throw new NotFoundException(`No se encontró servicio de ${dto.targetArea === 'RAD' ? 'Radiología' : 'Laboratorio'}`);
    }
    ticket.serviceId = targetService.id;
    ticket.status = TicketStatus.TRANSFERIDO;
    ticket.completedAt = new Date();
    await this.ticketRepository.save(ticket);
    await this.auditService.log('ticket_transferred', {
      entityType: 'ticket',
      entityId: ticket.id,
      userId: agent?.id,
      details: `targetArea=${dto.targetArea}`,
    });
    return { message: 'Ticket transferido', service_id: targetService.id, service_name: targetService.name };
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
      status: TicketStatus.CREADO,
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
      created_at: savedTicket.createdAt,
      qr_code: savedTicket.qrCode,
      preadmission_id: pre.id,
      ...qi,
    };
  }
}
