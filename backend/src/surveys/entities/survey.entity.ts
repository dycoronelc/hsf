import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  ticketId: number;

  @ManyToOne(() => Ticket, { nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ nullable: true })
  appointmentId: number;

  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column({ nullable: true })
  patientId: number;

  @Column({ nullable: true })
  npsScore: number; // 0-10 (Net Promoter Score)

  @Column({ nullable: true })
  csatScore: number; // 1-5 (Customer Satisfaction Score)

  @Column('text', { nullable: true })
  comments: string;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  submittedAt: Date;
}
