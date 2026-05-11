import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  action: string;

  @Column({ nullable: true })
  entityType: string | null;

  @Column({ nullable: true })
  entityId: number | null;

  @Column({ nullable: true })
  userId: number | null;

  @Column('text', { nullable: true })
  details: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
