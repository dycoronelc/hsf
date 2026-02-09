import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Distrito } from './distrito.entity';

@Entity('corregimientos')
export class Corregimiento {
  @PrimaryColumn()
  codigo: string;

  @Column()
  nombre: string;

  @Column()
  distritoCodigo: string;

  @ManyToOne(() => Distrito, (distrito) => distrito.corregimientos)
  @JoinColumn({ name: 'distritoCodigo' })
  distrito: Distrito;
}
