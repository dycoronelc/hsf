import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Distrito } from './distrito.entity';

@Entity('provincias')
export class Provincia {
  @PrimaryColumn()
  codigo: string;

  @Column()
  nombre: string;

  @OneToMany(() => Distrito, (distrito) => distrito.provincia)
  distritos: Distrito[];
}
