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

  /** IP de conexión del cliente (si está disponible). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  /** Módulo o pantalla donde ocurrió la acción. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  module: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
