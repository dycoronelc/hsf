import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Provincia } from './provincia.entity';
import { Corregimiento } from './corregimiento.entity';

@Entity('distritos')
export class Distrito {
  @PrimaryColumn()
  codigo: string;

  @Column()
  nombre: string;

  @Column()
  provinciaCodigo: string;

  @ManyToOne(() => Provincia, (provincia) => provincia.distritos)
  @JoinColumn({ name: 'provinciaCodigo' })
  provincia: Provincia;

  @OneToMany(() => Corregimiento, (corregimiento) => corregimiento.distrito)
  corregimientos: Corregimiento[];
}
