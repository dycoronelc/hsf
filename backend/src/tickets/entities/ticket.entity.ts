import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Service } from '../../services/entities/service.entity';
import { TicketStatus, Priority } from '../../common/enums';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ticketNumber: string;

  @Column({ nullable: true })
  patientId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column()
  serviceId: number;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'serviceId' })
  service: Service;

  @Column({
    type: 'text',
    default: TicketStatus.CREADO,
  })
  status: TicketStatus;

  @Column({
    type: 'text',
    default: Priority.NORMAL,
  })
  priority: Priority;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  checkInAt: Date;

  @Column({ nullable: true })
  calledAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  windowNumber: string;

  @Column({ nullable: true })
  calledBy: number;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ unique: true, nullable: true })
  qrCode: string;
}
