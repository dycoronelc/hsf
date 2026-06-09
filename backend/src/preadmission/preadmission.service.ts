import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Preadmission } from './entities/preadmission.entity';
import {
  CreatePreadmissionBodyDto,
  ReviewPreadmissionDto,
} from './dto/preadmission.dto';
import { PreadmissionStatus, PreadmissionArrivalState } from '../common/enums';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import { CellbyteService } from '../integrations/cellbyte.service';
import { TicketsService } from '../tickets/tickets.service';
import { parseCedulaQr } from './utils/parse-cedula-qr';
import { AuditService } from '../audit/audit.service';
import { VerificationCode } from '../auth/entities/verification-code.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PreadmissionStorageService } from './preadmission-storage.service';
import {
  PreadmissionAttachmentField,
  PREADMISSION_ATTACHMENT_FIELDS,
} from './preadmission-attachments.constants';
import { assertValidPhoneNumber } from '../common/phone.util';
import {
  toPreadmissionResponse,
  toPreadmissionSummary,
  PreadmissionResponse,
} from './preadmission-response.util';
import { PreadmissionUploadedFilesMap } from './preadmission-upload.types';

const NAME_RE = /^[\p{L}\s'-]+$/u;

export type PreadmissionUploadedFiles = PreadmissionUploadedFilesMap;

@Injectable()
export class PreadmissionService {
  private readonly logger = new Logger(PreadmissionService.name);

  constructor(
    @InjectRepository(Preadmission)
    private preadmissionRepository: Repository<Preadmission>,
    @InjectRepository(VerificationCode)
    private verificationRepository: Repository<VerificationCode>,
    private readonly cellbyteService: CellbyteService,
    private readonly ticketsService: TicketsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: PreadmissionStorageService,
  ) {}

  private assertPhoneNumbers(dto: CreatePreadmissionBodyDto) {
    try {
      assertValidPhoneNumber(dto.celularPrefix, dto.celular, 'Celular');
      assertValidPhoneNumber('507', dto.celular3, 'Celular de emergencia');
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Teléfono inválido');
    }
  }

  private departamentoLabel(code: string): string {
    if (code === 'LAB') return 'Laboratorio';
    if (code === 'RAD') return 'Radiología';
    return code;
  }

  private assertDuplicateCheckParams(
    cedula: string,
    pasaporte: string,
    departamento: string,
    fechaprobableatencion: string,
  ) {
    if (!cedula?.trim() || !pasaporte?.trim()) {
      throw new BadRequestException('Documento inválido');
    }
    if (!departamento?.trim() || !['RAD', 'LAB'].includes(departamento.trim().toUpperCase())) {
      throw new BadRequestException('Departamento inválido');
    }
    if (!fechaprobableatencion?.trim()) {
      throw new BadRequestException('Fecha probable de atención requerida');
    }
  }

  private async findDuplicateForServiceDay(
    cedula: string,
    pasaporte: string,
    departamento: string,
    fechaprobableatencion: string,
  ): Promise<Preadmission | null> {
    return this.preadmissionRepository.findOne({
      where: {
        cedula: cedula.trim(),
        pasaporte: pasaporte.trim(),
        departamento: departamento.trim().toUpperCase(),
        fechaprobableatencion: fechaprobableatencion.trim(),
        status: Not(PreadmissionStatus.RECHAZADO),
      },
      order: { fechapreadmision: 'DESC' },
    });
  }

  private duplicatePreadmissionMessage(departamento: string, fechaprobableatencion: string): string {
    const servicio = this.departamentoLabel(departamento.trim().toUpperCase());
    return `Ya existe una preadmisión para ${servicio} con fecha de atención ${fechaprobableatencion.trim()}. Solo se permite una preadmisión por servicio y día. Puede registrar otro servicio distinto (por ejemplo, Laboratorio y Radiología) para la misma fecha.`;
  }

  async checkActiveDocument(
    cedula: string,
    pasaporte: string,
    departamento: string,
    fechaprobableatencion: string,
  ) {
    this.assertDuplicateCheckParams(cedula, pasaporte, departamento, fechaprobableatencion);

    const existing = await this.findDuplicateForServiceDay(
      cedula,
      pasaporte,
      departamento,
      fechaprobableatencion,
    );
    if (existing) {
      return {
        active: true,
        message: this.duplicatePreadmissionMessage(departamento, fechaprobableatencion),
        id: existing.id,
        status: existing.status,
        departamento: existing.departamento,
        fechaprobableatencion: existing.fechaprobableatencion,
      };
    }
    return { active: false };
  }

  private generateQrCode(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  parseCedulaQrPayload(raw: string): Record<string, string> {
    return parseCedulaQr(raw);
  }

  private assertNamesAndAddress(dto: CreatePreadmissionBodyDto) {
    const names = [dto.name1, dto.name2, dto.apellido1, dto.apellido2].filter(Boolean) as string[];
    for (const n of names) {
      if (!NAME_RE.test(n)) {
        throw new BadRequestException('Nombres y apellidos: solo letras');
      }
    }
    if (dto.direccion1.length > 200) {
      throw new BadRequestException('Dirección máximo 200 caracteres');
    }
  }

  private formatCelular(prefix: string | undefined, celular: string): string {
    const p = (prefix || '507').replace(/^\+/, '');
    const num = celular.replace(/\s/g, '');
    if (num.startsWith('+')) return num;
    return `+${p}${num.replace(/^\+/, '')}`;
  }

  private buildEntityFromDto(
    dto: CreatePreadmissionBodyDto,
    patientId: number | null,
    attachmentPaths: Partial<Record<PreadmissionAttachmentField, string>>,
  ): Preadmission {
    const row: Partial<Preadmission> = {
      departamento: dto.departamento,
      registradoComo: dto.registradoComo,
      name1: dto.name1,
      name2: dto.name2 ?? null,
      apellido1: dto.apellido1,
      apellido2: dto.apellido2 ?? null,
      pasaporte: dto.pasaporte,
      cedula: dto.cedula,
      sexo: dto.sexo,
      fechanac: dto.fechanac,
      nacionalidad: dto.nacionalidad,
      estadocivil: dto.estadocivil,
      tiposangre: dto.tiposangre,
      email: dto.email,
      celularPrefix: dto.celularPrefix || '507',
      celular: this.formatCelular(dto.celularPrefix, dto.celular),
      provincia1: dto.provincia1,
      distrito1: dto.distrito1,
      corregimiento1: dto.corregimiento1,
      direccion1: dto.direccion1,
      encasourgencia: dto.encasourgencia,
      relacion: dto.relacion,
      email3: dto.email3,
      celular3: dto.celular3,
      provincia3: dto.provincia3 ?? null,
      distrito3: dto.distrito3 ?? null,
      corregimiento3: dto.corregimiento3 ?? null,
      direccion3: dto.direccion3 ?? null,
      fechaprobableatencion: dto.fechaprobableatencion ?? null,
      medico: dto.medico ?? null,
      doblecobertura: dto.doblecobertura,
      compania1: dto.compania1 ?? null,
      poliza1: dto.poliza1 ?? null,
      diagnostico: dto.diagnostico ?? null,
      procedimientoEstudio:
        dto.procedimientoEstudio?.trim() || dto.diagnostico?.trim() || null,
      numerocotizacion: dto.numerocotizacion ?? null,
      cedulaimagen: attachmentPaths.cedulaimagen ?? null,
      ordenimagen: attachmentPaths.ordenimagen ?? null,
      preautorizacion: attachmentPaths.preautorizacion ?? null,
      carnetseguro: attachmentPaths.carnetseguro ?? null,
      certificadoSeguro: attachmentPaths.certificadoSeguro ?? null,
      ssimagen: attachmentPaths.ssimagen ?? null,
      patientId: patientId !== undefined && patientId !== null ? patientId : null,
      status: PreadmissionStatus.ENVIADO,
      qrCode: this.generateQrCode(),
      arrivalState: PreadmissionArrivalState.ESPERA_LLEGADA,
    };

    if (dto.doblecobertura === 'NO') {
      row.compania1 = 'PACIENTE PRIVADO';
      row.poliza1 = '';
      row.carnetseguro = null;
      row.certificadoSeguro = null;
    } else if (!dto.compania1 || !dto.poliza1) {
      throw new BadRequestException('Compañía y póliza son obligatorias cuando mantiene seguro');
    }

    return this.preadmissionRepository.create(row as Preadmission);
  }

  async create(
    createDto: CreatePreadmissionBodyDto,
    patientId: number | null,
    uploadedFiles: PreadmissionUploadedFiles = {},
  ): Promise<PreadmissionResponse> {
    this.assertNamesAndAddress(createDto);
    this.assertPhoneNumbers(createDto);

    if (!createDto.fechaprobableatencion?.trim()) {
      throw new BadRequestException('Fecha probable de atención requerida');
    }

    const duplicate = await this.findDuplicateForServiceDay(
      createDto.cedula,
      createDto.pasaporte,
      createDto.departamento,
      createDto.fechaprobableatencion,
    );
    if (duplicate) {
      throw new BadRequestException(
        this.duplicatePreadmissionMessage(createDto.departamento, createDto.fechaprobableatencion),
      );
    }

    const preadmission = this.buildEntityFromDto(createDto, patientId, {});
    const saved = await this.preadmissionRepository.save(preadmission);

    const attachmentPaths = this.storageService.saveAttachments(saved.id, uploadedFiles);
    for (const field of PREADMISSION_ATTACHMENT_FIELDS) {
      if (attachmentPaths[field]) {
        saved[field] = attachmentPaths[field]!;
      }
    }
    if (createDto.doblecobertura === 'NO') {
      saved.carnetseguro = null;
      saved.certificadoSeguro = null;
    }
    await this.preadmissionRepository.save(saved);

    await this.auditService.log('preadmission_created', {
      entityType: 'preadmission',
      entityId: saved.id,
      userId: patientId ?? undefined,
      details: `departamento=${saved.departamento}`,
    });

    this.cellbyteService.sendPreadmission(saved).then(async () => {
      saved.cellbyteSentAt = new Date();
      await this.preadmissionRepository.save(saved);
    }).catch(() => undefined);

    this.notificationsService
      .sendPreadmissionConfirmation({
        id: saved.id,
        email: saved.email,
        name1: saved.name1,
        name2: saved.name2,
        apellido1: saved.apellido1,
        apellido2: saved.apellido2,
        departamento: saved.departamento,
        fechaprobableatencion: saved.fechaprobableatencion,
        qrCode: saved.qrCode,
        celular: saved.celular,
        fechapreadmision: saved.fechapreadmision,
      })
      .catch((err) => {
        this.logger.error(
          `No se pudo enviar confirmación por correo (preadmisión #${saved.id})`,
          err,
        );
      });

    return toPreadmissionResponse(saved);
  }

  async getAttachment(
    id: number,
    field: string,
    user: User,
  ): Promise<{ stream: import('@nestjs/common').StreamableFile; mime: string; filename: string }> {
    if (!this.storageService.isAttachmentField(field)) {
      throw new BadRequestException('Tipo de adjunto no válido');
    }

    const preadmission = await this.preadmissionRepository.findOne({ where: { id } });
    if (!preadmission) {
      throw new NotFoundException('Preadmisión no encontrada');
    }

    if (user.role === 'patient') {
      if (preadmission.patientId != null && preadmission.patientId !== user.id) {
        throw new ForbiddenException('No autorizado');
      }
    }

    const stored = preadmission[field];
    return this.storageService.openForDownload(stored, field);
  }

  async findAll(user: User, skip = 0, limit = 100): Promise<PreadmissionResponse[]> {
    const rows =
      user.role === 'patient'
        ? await this.preadmissionRepository.find({
            where: { patientId: user.id },
            skip,
            take: limit,
          })
        : await this.preadmissionRepository.find({
            skip,
            take: limit,
            order: { fechapreadmision: 'DESC' },
          });
    return rows.map(toPreadmissionResponse);
  }

  async findWorkList(
    user: User,
    opts: { arrivalState?: PreadmissionArrivalState; q?: string; skip?: number; limit?: number },
  ): Promise<ReturnType<typeof toPreadmissionSummary>[]> {
    const qb = this.preadmissionRepository
      .createQueryBuilder('p')
      .orderBy('p.fechapreadmision', 'DESC')
      .skip(opts.skip ?? 0)
      .take(Math.min(opts.limit ?? 100, 200));

    if (opts.arrivalState) {
      qb.andWhere('p.arrivalState = :arrivalState', { arrivalState: opts.arrivalState });
    }

    if (opts.q?.trim()) {
      const term = `%${opts.q.trim()}%`;
      qb.andWhere(
        '(p.cedula ILIKE :term OR p.name1 ILIKE :term OR p.apellido1 ILIKE :term OR CONCAT(p.name1, \' \', p.apellido1) ILIKE :term)',
        { term },
      );
    }

    const rows = await qb.getMany();
    return rows.map(toPreadmissionSummary);
  }

  async confirmArrival(id: number, user: User): Promise<PreadmissionResponse> {
    const pre = await this.preadmissionRepository.findOne({ where: { id } });
    if (!pre) {
      throw new NotFoundException('Preadmisión no encontrada');
    }

    if (
      pre.arrivalState !== PreadmissionArrivalState.ESPERA_LLEGADA &&
      pre.arrivalState !== PreadmissionArrivalState.REGISTRADO
    ) {
      throw new BadRequestException('Estado de llegada no permite confirmar presencia');
    }

    pre.arrivalState = PreadmissionArrivalState.PACIENTE_PRESENTE;
    pre.confirmedArrivalAt = new Date();
    pre.confirmedArrivalBy = { id: user.id } as User;
    pre.checkInAt = new Date();

    const saved = await this.preadmissionRepository.save(pre);
    return toPreadmissionResponse(saved);
  }

  async activateTicket(id: number, user: User): Promise<unknown> {
    return this.ticketsService.createTicketForPreadmission(id);
  }

  async findOne(id: number, user: User): Promise<PreadmissionResponse> {
    const preadmission = await this.preadmissionRepository.findOne({ where: { id } });
    if (!preadmission) {
      throw new NotFoundException('Preadmisión no encontrada');
    }
    if (
      user.role === 'patient' &&
      preadmission.patientId != null &&
      preadmission.patientId !== user.id
    ) {
      throw new ForbiddenException('No autorizado');
    }
    return toPreadmissionResponse(preadmission);
  }

  async findByCedula(cedula: string, tipoIdentificacion: string) {
    const row = await this.preadmissionRepository.findOne({
      where: { cedula, pasaporte: tipoIdentificacion },
      order: { fechapreadmision: 'DESC' },
    });
    return row ? toPreadmissionSummary(row) : null;
  }

  async review(
    id: number,
    reviewDto: ReviewPreadmissionDto,
    reviewerId: number,
  ): Promise<{ message: string; status: PreadmissionStatus }> {
    const preadmission = await this.preadmissionRepository.findOne({ where: { id } });
    if (!preadmission) {
      throw new NotFoundException('Preadmisión no encontrada');
    }

    preadmission.status = reviewDto.status;
    preadmission.observaciones = reviewDto.observaciones;
    preadmission.reviewedBy = reviewerId;
    preadmission.reviewedAt = new Date();

    await this.preadmissionRepository.save(preadmission);
    return { message: 'Preadmisión actualizada', status: reviewDto.status };
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async requestContactVerification(destination: string) {
    const normalized = destination.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Correo de verificación inválido');
    }
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.verificationRepository.save(
      this.verificationRepository.create({
        channel: 'email',
        destination: normalized,
        code,
        expiresAt,
        verified: false,
      }),
    );

    try {
      await this.notificationsService.sendEmailVerificationCode(normalized, code);
    } catch (err) {
      this.logger.error(`No se pudo enviar código de verificación a ${normalized}`, err);
      throw new BadRequestException('No se pudo enviar el código al correo. Intente más tarde.');
    }

    return {
      message: 'Código enviado al correo',
      destination: normalized,
      expiresAt,
      previewCode: process.env.NODE_ENV !== 'production' ? code : undefined,
    };
  }

  async confirmContactVerification(destination: string, code: string) {
    const normalized = destination.trim().toLowerCase();
    const row = await this.verificationRepository.findOne({
      where: { channel: 'email', destination: normalized, code, verified: false },
      order: { createdAt: 'DESC' },
    });
    if (!row || row.expiresAt < new Date()) {
      throw new BadRequestException('Código inválido o expirado');
    }
    row.verified = true;
    await this.verificationRepository.save(row);
    return { message: 'Correo verificado', destination: normalized };
  }
}
