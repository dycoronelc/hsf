"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PreadmissionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreadmissionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const preadmission_entity_1 = require("./entities/preadmission.entity");
const enums_1 = require("../common/enums");
const crypto = require("crypto");
const cellbyte_service_1 = require("../integrations/cellbyte.service");
const tickets_service_1 = require("../tickets/tickets.service");
const parse_cedula_qr_1 = require("./utils/parse-cedula-qr");
const audit_service_1 = require("../audit/audit.service");
const verification_code_entity_1 = require("../auth/entities/verification-code.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const NAME_RE = /^[\p{L}\s'-]+$/u;
let PreadmissionService = PreadmissionService_1 = class PreadmissionService {
    constructor(preadmissionRepository, verificationRepository, cellbyteService, ticketsService, auditService, notificationsService) {
        this.preadmissionRepository = preadmissionRepository;
        this.verificationRepository = verificationRepository;
        this.cellbyteService = cellbyteService;
        this.ticketsService = ticketsService;
        this.auditService = auditService;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(PreadmissionService_1.name);
    }
    generateQrCode() {
        return crypto.randomBytes(8).toString('hex').toUpperCase();
    }
    parseCedulaQrPayload(raw) {
        return (0, parse_cedula_qr_1.parseCedulaQr)(raw);
    }
    assertNamesAndAddress(dto) {
        const names = [dto.name1, dto.name2, dto.apellido1, dto.apellido2].filter(Boolean);
        for (const n of names) {
            if (!NAME_RE.test(n)) {
                throw new common_1.BadRequestException('Nombres y apellidos: solo letras');
            }
        }
        if (dto.direccion1.length > 200) {
            throw new common_1.BadRequestException('Dirección máximo 200 caracteres');
        }
    }
    formatCelular(prefix, celular) {
        const p = (prefix || '507').replace(/^\+/, '');
        const num = celular.replace(/\s/g, '');
        if (num.startsWith('+'))
            return num;
        return `+${p}${num.replace(/^\+/, '')}`;
    }
    async create(createDto, patientId) {
        if (!createDto.cedulaimagen) {
            throw new common_1.BadRequestException('La imagen de cédula es obligatoria');
        }
        this.assertNamesAndAddress(createDto);
        const row = { ...createDto };
        const existing = await this.preadmissionRepository.findOne({
            where: { cedula: createDto.cedula, pasaporte: createDto.pasaporte },
            order: { fechapreadmision: 'DESC' },
        });
        if (existing && existing.status !== enums_1.PreadmissionStatus.RECHAZADO) {
            throw new common_1.BadRequestException('Ya existe una preadmisión activa con este documento');
        }
        if (createDto.doblecobertura === 'NO') {
            row.compania1 = 'PACIENTE PRIVADO';
            row.poliza1 = '';
            row.carnetseguro = null;
            row.certificadoSeguro = null;
            row.preautorizacion = createDto.preautorizacion ?? null;
        }
        else if (!createDto.compania1 || !createDto.poliza1) {
            throw new common_1.BadRequestException('Compañía y póliza son obligatorias cuando mantiene seguro');
        }
        row.procedimientoEstudio =
            createDto.procedimientoEstudio?.trim() || createDto.diagnostico?.trim() || null;
        row.celularPrefix = createDto.celularPrefix || '507';
        row.celular = this.formatCelular(row.celularPrefix, createDto.celular);
        const preadmission = this.preadmissionRepository.create({
            ...row,
            patientId: patientId !== undefined && patientId !== null ? patientId : null,
            status: enums_1.PreadmissionStatus.ENVIADO,
            qrCode: this.generateQrCode(),
            arrivalState: enums_1.PreadmissionArrivalState.ESPERA_LLEGADA,
        });
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
            this.logger.error(`No se pudo enviar confirmación por correo (preadmisión #${saved.id})`, err);
        });
        return saved;
    }
    async findAll(user, skip = 0, limit = 100) {
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
    async findWorkList(user, opts) {
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
            qb.andWhere('(p.cedula ILIKE :term OR p.name1 ILIKE :term OR p.apellido1 ILIKE :term OR CONCAT(p.name1, \' \', p.apellido1) ILIKE :term)', { term });
        }
        return qb.getMany();
    }
    async confirmArrival(id, user) {
        const pre = await this.preadmissionRepository.findOne({ where: { id } });
        if (!pre) {
            throw new common_1.NotFoundException('Preadmisión no encontrada');
        }
        if (pre.arrivalState !== enums_1.PreadmissionArrivalState.ESPERA_LLEGADA &&
            pre.arrivalState !== enums_1.PreadmissionArrivalState.REGISTRADO) {
            throw new common_1.BadRequestException('Estado de llegada no permite confirmar presencia');
        }
        pre.arrivalState = enums_1.PreadmissionArrivalState.PACIENTE_PRESENTE;
        pre.confirmedArrivalAt = new Date();
        pre.confirmedArrivalBy = { id: user.id };
        pre.checkInAt = new Date();
        return this.preadmissionRepository.save(pre);
    }
    async activateTicket(id, user) {
        return this.ticketsService.createTicketForPreadmission(id);
    }
    async findOne(id, user) {
        const preadmission = await this.preadmissionRepository.findOne({ where: { id } });
        if (!preadmission) {
            throw new common_1.NotFoundException('Preadmisión no encontrada');
        }
        if (user.role === 'patient' &&
            preadmission.patientId != null &&
            preadmission.patientId !== user.id) {
            throw new common_1.ForbiddenException('No autorizado');
        }
        return preadmission;
    }
    async findByCedula(cedula, tipoIdentificacion) {
        return this.preadmissionRepository.findOne({
            where: { cedula, pasaporte: tipoIdentificacion },
            order: { fechapreadmision: 'DESC' },
        });
    }
    async review(id, reviewDto, reviewerId) {
        const preadmission = await this.preadmissionRepository.findOne({ where: { id } });
        if (!preadmission) {
            throw new common_1.NotFoundException('Preadmisión no encontrada');
        }
        preadmission.status = reviewDto.status;
        preadmission.observaciones = reviewDto.observaciones;
        preadmission.reviewedBy = reviewerId;
        preadmission.reviewedAt = new Date();
        await this.preadmissionRepository.save(preadmission);
        return { message: 'Preadmisión actualizada', status: reviewDto.status };
    }
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async requestContactVerification(destination) {
        const normalized = destination.trim().toLowerCase();
        if (!normalized) {
            throw new common_1.BadRequestException('Correo de verificación inválido');
        }
        const code = this.generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await this.verificationRepository.save(this.verificationRepository.create({
            channel: 'email',
            destination: normalized,
            code,
            expiresAt,
            verified: false,
        }));
        try {
            await this.notificationsService.sendEmailVerificationCode(normalized, code);
        }
        catch (err) {
            this.logger.error(`No se pudo enviar código de verificación a ${normalized}`, err);
            throw new common_1.BadRequestException('No se pudo enviar el código al correo. Intente más tarde.');
        }
        return {
            message: 'Código enviado al correo',
            destination: normalized,
            expiresAt,
            previewCode: (0, notifications_service_1.isSmtpDeliveryEnabled)() ? undefined : code,
        };
    }
    async confirmContactVerification(destination, code) {
        const normalized = destination.trim().toLowerCase();
        const row = await this.verificationRepository.findOne({
            where: { channel: 'email', destination: normalized, code, verified: false },
            order: { createdAt: 'DESC' },
        });
        if (!row || row.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Código inválido o expirado');
        }
        row.verified = true;
        await this.verificationRepository.save(row);
        return { message: 'Correo verificado', destination: normalized };
    }
};
exports.PreadmissionService = PreadmissionService;
exports.PreadmissionService = PreadmissionService = PreadmissionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(preadmission_entity_1.Preadmission)),
    __param(1, (0, typeorm_1.InjectRepository)(verification_code_entity_1.VerificationCode)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        cellbyte_service_1.CellbyteService,
        tickets_service_1.TicketsService,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], PreadmissionService);
//# sourceMappingURL=preadmission.service.js.map