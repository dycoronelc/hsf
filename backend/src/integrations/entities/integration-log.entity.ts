import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('integration_logs')
export class IntegrationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  integration: string;

  @Column({ nullable: true })
  preadmissionId: number | null;

  @Column('text', { nullable: true })
  requestPayload: string | null;

  @Column('text', { nullable: true })
  responseBody: string | null;

  @Column({ default: false })
  success: boolean;

  @Column({ default: 1 })
  attempt: number;

  @Column('text', { nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
