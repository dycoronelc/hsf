import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Service } from '../../services/entities/service.entity';
import { User } from '../../users/entities/user.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column()
  serviceId: number;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'serviceId' })
  service: Service;

  @Column()
  scheduledDate: Date;

  @Column({ type: 'time', nullable: true })
  scheduledTime: string; // HH:MM format

  @Column({ default: 30 })
  duration: number; // minutos

  @Column({ default: 'scheduled' })
  status: string; // scheduled, confirmed, completed, cancelled

  @Column('text', { nullable: true })
  notes: string;

  @Column({ nullable: true })
  confirmedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
