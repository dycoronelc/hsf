import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('nacionalidades')
export class Nacionalidad {
  @PrimaryColumn()
  codigo: string;

  @Column()
  nacionalidad: string;

  @Column()
  pais: string;
}
