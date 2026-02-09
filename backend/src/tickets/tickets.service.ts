import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { CreateTicketDto, UpdateTicketDto } from './dto/ticket.dto';
import { TicketStatus, Priority } from '../common/enums';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { SurveysService } from '../surveys/surveys.service';

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
  ) {}

  private generateTicketNumber(serviceCode: string): string {
    const randomSuffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${serviceCode}-${randomSuffix}`;
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
  ): Promise<Map<number, { queue_position: number; ahead_count: number }>> {
    const serviceIds = Array.from(new Set(tickets.map((t) => t.serviceId)));
    const serviceMaps = await Promise.all(
      serviceIds.map(async (sid) => [sid, await this.getQueuePositionsByService(sid)] as const),
    );
    const byService = new Map<number, Map<number, number>>(serviceMaps);

    const out = new Map<number, { queue_position: number; ahead_count: number }>();
    for (const t of tickets) {
      const pos = byService.get(t.serviceId)?.get(t.id) ?? 0;
      out.set(t.id, { queue_position: pos, ahead_count: Math.max(0, pos - 1) });
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
      ticketNumber: this.generateTicketNumber(service.code),
      patientId: null, // Ticket anónimo desde kiosco
      serviceId: createDto.serviceId,
      priority: createDto.priority || Priority.NORMAL,
      status: TicketStatus.CREADO,
      qrCode: this.generateQrCode(),
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    const queueInfo = await this.enrichWithQueueInfo([{ id: savedTicket.id, serviceId: savedTicket.serviceId }]);
    const qi = queueInfo.get(savedTicket.id) ?? { queue_position: 0, ahead_count: 0 };

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
      ticketNumber: this.generateTicketNumber(service.code),
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
    const qi = queueInfo.get(savedTicket.id) ?? { queue_position: 0, ahead_count: 0 };

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
      const qi = queueInfo.get(ticket.id) ?? { queue_position: 0, ahead_count: 0 };
      return {
        id: ticket.id,
        ticket_number: ticket.ticketNumber,
        service_id: ticket.serviceId,
        service_name: ticket.service?.name,
        status: ticket.status,
        priority: ticket.priority,
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
      const qi = queueInfo.get(ticket.id) ?? { queue_position: 0, ahead_count: 0 };
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

  async call(id: number, windowNumber: string, calledBy: number) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    ticket.status = TicketStatus.LLAMADO;
    ticket.calledAt = new Date();
    ticket.calledBy = calledBy;
    ticket.windowNumber = windowNumber;
    await this.ticketRepository.save(ticket);
    
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

  async start(id: number) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    ticket.status = TicketStatus.EN_ATENCION;
    ticket.startedAt = new Date();
    await this.ticketRepository.save(ticket);
    return { message: 'Atención iniciada' };
  }

  async complete(id: number) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    ticket.status = TicketStatus.FINALIZADO;
    ticket.completedAt = new Date();
    await this.ticketRepository.save(ticket);
    
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
}
