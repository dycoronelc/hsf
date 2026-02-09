import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PreadmissionStatus } from '../../common/enums';

@Entity('preadmissions')
export class Preadmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  // Datos del JSON
  @Column()
  departamento: string; // RAD o LAB

  @Column()
  name1: string;

  @Column({ nullable: true })
  name2: string;

  @Column()
  apellido1: string;

  @Column({ nullable: true })
  apellido2: string;

  @Column()
  pasaporte: string; // C o P

  @Column()
  cedula: string;

  @Column()
  sexo: string; // M o F

  @Column()
  fechanac: string; // DD/MM/YYYY

  @Column()
  nacionalidad: string;

  @Column()
  estadocivil: string;

  @Column()
  tiposangre: string;

  @Column()
  email: string;

  @Column()
  celular: string;

  @Column()
  provincia1: string;

  @Column()
  distrito1: string;

  @Column()
  corregimiento1: string;

  @Column()
  direccion1: string;

  @Column()
  encasourgencia: string;

  @Column()
  relacion: string;

  @Column()
  email3: string;

  @Column()
  celular3: string;

  @Column({ nullable: true })
  provincia3: string;

  @Column({ nullable: true })
  distrito3: string;

  @Column({ nullable: true })
  corregimiento3: string;

  @Column({ nullable: true })
  direccion3: string;

  @Column({ nullable: true })
  fechaprobableatencion: string; // DD/MM/YYYY

  @Column({ nullable: true })
  medico: string;

  @Column()
  doblecobertura: string; // SI/NO

  @Column({ nullable: true })
  compania1: string;

  @Column({ nullable: true })
  poliza1: string;

  @Column({ nullable: true })
  diagnostico: string;

  @Column({ nullable: true })
  numerocotizacion: string;

  // Adjuntos (base64)
  @Column('text', { nullable: true })
  cedulaimagen: string;

  @Column('text', { nullable: true })
  ordenimagen: string;

  @Column('text', { nullable: true })
  preautorizacion: string;

  @Column('text', { nullable: true })
  carnetseguro: string;

  @Column('text', { nullable: true })
  ssimagen: string;

  // Estado y control
  @Column({
    type: 'text',
    default: PreadmissionStatus.BORRADOR,
  })
  status: PreadmissionStatus;

  @CreateDateColumn()
  fechapreadmision: Date;

  @Column('text', { nullable: true })
  observaciones: string;

  @Column({ nullable: true })
  reviewedBy: number;

  @Column({ nullable: true })
  reviewedAt: Date;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ nullable: true })
  checkInAt: Date;
}
