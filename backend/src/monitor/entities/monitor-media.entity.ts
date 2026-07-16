import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type MonitorMediaKind = 'message' | 'image' | 'video';

@Entity('monitor_media')
export class MonitorMedia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: 'message' })
  kind: MonitorMediaKind;

  @Column({ length: 200 })
  title: string;

  /** Texto del mensaje, URL de video externo, o ruta relativa de imagen subida. */
  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
