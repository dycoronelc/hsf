import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Distrito } from './distrito.entity';

/**
 * Códigos Cellbyte: únicos solo dentro del distrito
 * (p. ej. corregimiento "4" en Arraiján = Juan Demóstenes Arosemena).
 * PK compuesta (codigo + distrito + provincia).
 */
@Entity('corregimientos')
export class Corregimiento {
  @PrimaryColumn()
  codigo: string;

  @PrimaryColumn()
  distritoCodigo: string;

  @PrimaryColumn()
  provinciaCodigo: string;

  @Column()
  nombre: string;

  @ManyToOne(() => Distrito, (distrito) => distrito.corregimientos)
  @JoinColumn([
    { name: 'distritoCodigo', referencedColumnName: 'codigo' },
    { name: 'provinciaCodigo', referencedColumnName: 'provinciaCodigo' },
  ])
  distrito: Distrito;
}
