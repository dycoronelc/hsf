import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  EMAIL = 'email',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column()
  type: NotificationType;

  @Column()
  subject: string;

  @Column('text')
  content: string;

  @Column({ default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column({ nullable: true })
  sentAt: Date;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  relatedEntityType: string; // p. ej. 'ticket', 'preadmission'

  @Column({ nullable: true })
  relatedEntityId: number;

  @CreateDateColumn()
  createdAt: Date;
}
