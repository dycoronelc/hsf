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

  @Column({ nullable: true })
  estimatedTime: number; // minutos

  @Column({ default: false })
  requiresAppointment: boolean;

  @OneToMany(() => Ticket, (ticket) => ticket.service)
  tickets: Ticket[];
}
