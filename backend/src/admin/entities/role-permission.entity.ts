import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('role_permissions')
@Unique(['role', 'permissionKey'])
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  role: string;

  @Column()
  permissionKey: string;

  /** false debe persistirse; sin type boolean TypeORM a veces no actualiza denegaciones. */
  @Column({ type: 'boolean', default: true })
  allowed: boolean;
}
