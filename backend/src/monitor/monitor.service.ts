import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { TicketStatus, PreadmissionStatus } from '../common/enums';

@Injectable()
export class MonitorService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Preadmission)
    private preadmissionRepository: Repository<Preadmission>,
  ) {}

  async getQueue(serviceId: number) {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    // Ticket actualmente llamado
    const current = await this.ticketRepository.findOne({
      where: {
        serviceId,
        status: TicketStatus.LLAMADO,
      },
      order: { calledAt: 'DESC' },
    });

    // Cola de espera
    const queueTickets = await this.ticketRepository.find({
      where: [
        { serviceId, status: TicketStatus.CHECK_IN },
        { serviceId, status: TicketStatus.EN_COLA },
      ],
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
    });

    const currentItem = current
      ? {
          ticket_number: current.ticketNumber,
          service_name: service.name,
          priority: current.priority,
          wait_time: current.calledAt
            ? Math.floor(
                (new Date().getTime() - new Date(current.calledAt).getTime()) /
                  60000,
              )
            : null,
          status: current.status,
        }
      : null;

    const queueItems = queueTickets.map((ticket) => ({
      ticket_number: ticket.ticketNumber,
      service_name: service.name,
      priority: ticket.priority,
      wait_time: ticket.checkInAt
        ? Math.floor(
            (new Date().getTime() - new Date(ticket.checkInAt).getTime()) /
              60000,
          )
        : null,
      status: ticket.status,
    }));

    const nextNumbers = queueItems.slice(0, 5).map((item) => item.ticket_number);

    return {
      service_id: service.id,
      service_name: service.name,
      current: currentItem,
      queue: queueItems,
      next_numbers: nextNumbers,
    };
  }

  async getAllQueues() {
    const services = await this.serviceRepository.find({
      where: { isActive: true },
    });

    return Promise.all(
      services.map((service) => this.getQueue(service.id)),
    );
  }

  /** Preadmisiones pendientes de revisión para mostrar en el Monitor (junto a los cupos) */
  async getPreadmissionsForMonitor(): Promise<
    { departamento: string; label: string; items: PreadmissionMonitorItem[] }[]
  > {
    const pending = await this.preadmissionRepository.find({
      where: {
        status: In([
          PreadmissionStatus.ENVIADO,
          PreadmissionStatus.EN_REVISION,
          PreadmissionStatus.REQUIERE_SUBSANACION,
        ]),
      },
      order: { fechapreadmision: 'DESC' },
      take: 100,
    });

    const byDept = pending.reduce<Record<string, PreadmissionMonitorItem[]>>(
      (acc, p) => {
        const dept = p.departamento || 'OTRO';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push({
          id: p.id,
          cedula: p.cedula,
          nombre: [p.name1, p.name2, p.apellido1, p.apellido2]
            .filter(Boolean)
            .join(' '),
          status: p.status,
          fechapreadmision: p.fechapreadmision,
        });
        return acc;
      },
      {},
    );

    const labels: Record<string, string> = {
      LAB: 'Laboratorio',
      RAD: 'Radiología',
      OTRO: 'Otros',
    };

    return Object.entries(byDept).map(([departamento, items]) => ({
      departamento,
      label: labels[departamento] || departamento,
      items,
    }));
  }
}

export interface PreadmissionMonitorItem {
  id: number;
  cedula: string;
  nombre: string;
  status: string;
  fechapreadmision: Date;
}
