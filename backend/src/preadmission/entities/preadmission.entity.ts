import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PreadmissionStatus, PreadmissionArrivalState } from '../../common/enums';

@Entity('preadmissions')
export class Preadmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  patientId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: User | null;

  // Datos del JSON
  @Column()
  departamento: string; // RAD o LAB

  /** Paciente o acompañante que completa el registro (PDF preadmisiones). */
  @Column({ default: 'paciente' })
  registradoComo: string;

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
  procedimientoEstudio: string | null;

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

  /** Certificado de seguro (opcional si tiene seguro, PDF requisitos) */
  @Column('text', { nullable: true })
  certificadoSeguro: string | null;

  /** Prefijo país del celular principal (ej. 507); el número puede ir sin + en celular */
  @Column({ nullable: true, default: '507' })
  celularPrefix: string | null;

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

  /** Flujo anfitrión (PDF requisitos) */
  @Column({
    type: 'text',
    default: PreadmissionArrivalState.ESPERA_LLEGADA,
  })
  arrivalState: PreadmissionArrivalState;

  @Column({ nullable: true })
  confirmedArrivalAt: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'confirmedArrivalByUserId' })
  confirmedArrivalBy: User | null;

  /** Ticket de admisión generado al activar turno */
  @Column({ nullable: true })
  ticketId: number | null;

  @Column({ nullable: true })
  cellbyteSentAt: Date | null;
}
