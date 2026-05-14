import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('admin_role_matrix_rows')
export class AdminRoleMatrixRow {
  @PrimaryColumn({ type: 'text' })
  role: string;

  @Column({ default: true })
  isActive: boolean;
}
