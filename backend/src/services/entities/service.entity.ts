import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Sede } from './sede.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column()
  area: string; // LAB, RAD, ADMISION

  @Column({ nullable: true })
  sedeId: number;

  @ManyToOne(() => Sede, (sede) => sede.services)
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @Column({ default: true })
  isActive: boolean;

  /** Tiempo estimado de cola (minutos) — legado / UI kiosco. */
  @Column({ nullable: true })
  estimatedTime: number; // minutos

  /** SLA de espera en ventanilla (minutos) para reportes. */
  @Column({ type: 'int', nullable: true })
  slaWaitMinutes: number | null;

  /** SLA de tiempo de atención (minutos) para reportes. */
  @Column({ type: 'int', nullable: true })
  slaAttentionMinutes: number | null;

  /** Prefijo del ticket (PDF: H, PMSF, LR, etc.). */
  @Column({ nullable: true })
  ticketPrefix: string | null;

  /** Prioridad operativa 1–3 por tipo de ticket. */
  @Column({ type: 'int', default: 2 })
  priorityLevel: number;

  @Column({ default: false })
  requiresAppointment: boolean;

  @OneToMany(() => Ticket, (ticket) => ticket.service)
  tickets: Ticket[];
}
