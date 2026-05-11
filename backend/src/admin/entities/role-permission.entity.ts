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

  @Column({ default: true })
  allowed: boolean;
}
