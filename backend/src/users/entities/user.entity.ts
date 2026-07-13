import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole, AgentState } from '../../common/enums';
import { Preadmission } from '../../preadmission/entities/preadmission.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  hashedPassword: string;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, unique: true })
  nationalId: string | null;

  @Column({ nullable: true })
  birthDate: string | null;

  @Column({
    type: 'text',
    default: UserRole.PATIENT,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  /** Usuario dedicado (p. ej. pantalla monitor) sin expiración de sesión JWT. */
  @Column({ default: false })
  sessionNeverExpires: boolean;

  @Column({ type: 'text', nullable: true })
  agentState: AgentState | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Preadmission, (preadmission) => preadmission.patient)
  preadmissions: Preadmission[];

  @OneToMany(() => Ticket, (ticket) => ticket.patient)
  tickets: Ticket[];
}
