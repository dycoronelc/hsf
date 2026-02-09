import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('ubicaciones_geo')
export class UbicacionGeo {
  @PrimaryColumn()
  id: string; // Combinación de corregcode

  @Column()
  pais: string;

  @Column()
  paisName: string;

  @Column()
  provincia: string;

  @Column()
  provinciaName: string;

  @Column()
  distrito: string;

  @Column()
  distritoName: string;

  @Column()
  corregCode: string;

  @Column()
  corregimiento: string;
}
