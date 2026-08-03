import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Provincia } from './provincia.entity';
import { Corregimiento } from './corregimiento.entity';

/**
 * Códigos Cellbyte: únicos solo dentro de la provincia
 * (p. ej. distrito "1" = Arraiján en 13 y reutilización de "8" en varias provincias).
 */
@Entity('distritos')
export class Distrito {
  @PrimaryColumn()
  codigo: string;

  @PrimaryColumn()
  provinciaCodigo: string;

  @Column()
  nombre: string;

  @ManyToOne(() => Provincia, (provincia) => provincia.distritos)
  @JoinColumn({ name: 'provinciaCodigo' })
  provincia: Provincia;

  @OneToMany(() => Corregimiento, (corregimiento) => corregimiento.distrito)
  corregimientos: Corregimiento[];
}
