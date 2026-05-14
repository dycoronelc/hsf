import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Preadmission } from './entities/preadmission.entity';
import { CreatePreadmissionDto, ReviewPreadmissionDto } from './dto/preadmission.dto';
import { PreadmissionStatus, PreadmissionArrivalState } from '../common/enums';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import { CellbyteService } from '../integrations/cellbyte.service';
import { TicketsService } from '../tickets/tickets.service';
import { parseCedulaQr } from './utils/parse-cedula-qr';
import { AuditService } from '../audit/audit.service';
import { VerificationCode } from '../auth/entities/verification-code.entity';

const NAME_RE = /^[\p{L}\s'-]+$/u;

@Injectable()
export class PreadmissionService {
  constructor(
    @InjectRepository(Preadmission)
    private preadmissionRepository: Repository<Preadmission>,
    @InjectRepository(VerificationCode)
    private verificationRepository: Repository<VerificationCode>,
    private readonly cellbyteService: CellbyteService,
    private readonly ticketsService: TicketsService,
    private readonly auditService: AuditService,
  ) {}

  private generateQrCode(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  parseCedulaQrPayload(raw: string): Record<string, string> {
    return parseCedulaQr(raw);
  }

  private assertNamesAndAddress(dto: CreatePreadmissionDto) {
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

  async create(createDto: CreatePreadmissionDto, patientId: number | null): Promise<Preadmission> {
    if (!createDto.cedulaimagen) {
      throw new BadRequestException('La imagen de cédula es obligatoria');
    }

    this.assertNamesAndAddress(createDto);

    const row: Partial<Preadmission> & CreatePreadmissionDto = { ...createDto };

    const existing = await this.preadmissionRepository.findOne({
      where: { cedula: createDto.cedula, pasaporte: createDto.pasaporte },
      order: { fechapreadmision: 'DESC' },
    });
    if (existing && existing.status !== PreadmissionStatus.RECHAZADO) {
      throw new BadRequestException('Ya existe una preadmisión activa con este documento');
    }

    if (createDto.doblecobertura === 'NO') {
      row.compania1 = 'PACIENTE PRIVADO';
      row.poliza1 = '';
      row.carnetseguro = null;
      row.certificadoSeguro = null;
      row.preautorizacion = createDto.preautorizacion ?? null;
    } else if (!createDto.compania1 || !createDto.poliza1) {
      throw new BadRequestException('Compañía y póliza son obligatorias cuando mantiene seguro');
    }

    row.procedimientoEstudio =
      createDto.procedimientoEstudio?.trim() || createDto.diagnostico?.trim() || null;

    row.celularPrefix = createDto.celularPrefix || '507';
    row.celular = this.formatCelular(row.celularPrefix, createDto.celular);

    const preadmission = this.preadmissionRepository.create({
      ...row,
      patientId: patientId !== undefined && patientId !== null ? patientId : null,
      status: PreadmissionStatus.ENVIADO,
      qrCode: this.generateQrCode(),
      arrivalState: PreadmissionArrivalState.ESPERA_LLEGADA,
    } as Preadmission);

    const saved = await this.preadmissionRepository.save(preadmission);

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

    return saved;
  }

  async findAll(user: User, skip = 0, limit = 100): Promise<Preadmission[]> {
    if (user.role === 'patient') {
      return this.preadmissionRepository.find({
        where: { patientId: user.id },
        skip,
        take: limit,
      });
    }
    return this.preadmissionRepository.find({
      skip,
      take: limit,
      order: { fechapreadmision: 'DESC' },
    });
  }

  async findWorkList(
    user: User,
    opts: { arrivalState?: PreadmissionArrivalState; q?: string; skip?: number; limit?: number },
  ): Promise<Preadmission[]> {
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

    return qb.getMany();
  }

  async confirmArrival(id: number, user: User): Promise<Preadmission> {
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

    return this.preadmissionRepository.save(pre);
  }

  async activateTicket(id: number, user: User): Promise<unknown> {
    return this.ticketsService.createTicketForPreadmission(id);
  }

  async findOne(id: number, user: User): Promise<Preadmission> {
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
    return preadmission;
  }

  async findByCedula(cedula: string, tipoIdentificacion: string): Promise<Preadmission | null> {
    return this.preadmissionRepository.findOne({
      where: { cedula, pasaporte: tipoIdentificacion },
      order: { fechapreadmision: 'DESC' },
    });
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

  async requestContactVerification(channel: 'email' | 'sms', destination: string) {
    const normalized = destination.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Destino de verificación inválido');
    }
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.verificationRepository.save(
      this.verificationRepository.create({
        channel,
        destination: normalized,
        code,
        expiresAt,
        verified: false,
      }),
    );
    return {
      message: 'Código de verificación generado',
      channel,
      destination: normalized,
      expiresAt,
      previewCode: process.env.NODE_ENV === 'production' ? undefined : code,
    };
  }

  async confirmContactVerification(channel: 'email' | 'sms', destination: string, code: string) {
    const normalized = destination.trim().toLowerCase();
    const row = await this.verificationRepository.findOne({
      where: { channel, destination: normalized, code, verified: false },
      order: { createdAt: 'DESC' },
    });
    if (!row || row.expiresAt < new Date()) {
      throw new BadRequestException('Código inválido o expirado');
    }
    row.verified = true;
    await this.verificationRepository.save(row);
    return { message: 'Verificación exitosa', channel, destination: normalized };
  }
}
