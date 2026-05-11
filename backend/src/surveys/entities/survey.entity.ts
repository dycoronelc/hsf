import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';

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
  patientId: number;

  @Column({ nullable: true })
  npsScore: number;

  @Column({ nullable: true })
  csatScore: number;

  @Column('text', { nullable: true })
  comments: string;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  submittedAt: Date;
}
