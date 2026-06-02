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
const preadmission_storage_service_1 = require("./preadmission-storage.service");
const preadmission_attachments_constants_1 = require("./preadmission-attachments.constants");
const phone_util_1 = require("../common/phone.util");
const preadmission_response_util_1 = require("./preadmission-response.util");
const NAME_RE = /^[\p{L}\s'-]+$/u;
let PreadmissionService = PreadmissionService_1 = class PreadmissionService {
    constructor(preadmissionRepository, verificationRepository, cellbyteService, ticketsService, auditService, notificationsService, storageService) {
        this.preadmissionRepository = preadmissionRepository;
        this.verificationRepository = verificationRepository;
        this.cellbyteService = cellbyteService;
        this.ticketsService = ticketsService;
        this.auditService = auditService;
        this.notificationsService = notificationsService;
        this.storageService = storageService;
        this.logger = new common_1.Logger(PreadmissionService_1.name);
    }
    assertPhoneNumbers(dto) {
        try {
            (0, phone_util_1.assertValidPhoneNumber)(dto.celularPrefix, dto.celular, 'Celular');
            (0, phone_util_1.assertValidPhoneNumber)('507', dto.celular3, 'Celular de emergencia');
        }
        catch (err) {
            throw new common_1.BadRequestException(err instanceof Error ? err.message : 'Teléfono inválido');
        }
    }
    async checkActiveDocument(cedula, pasaporte) {
        if (!cedula?.trim() || !pasaporte?.trim()) {
            throw new common_1.BadRequestException('Documento inválido');
        }
        const existing = await this.preadmissionRepository.findOne({
            where: { cedula: cedula.trim(), pasaporte: pasaporte.trim() },
            order: { fechapreadmision: 'DESC' },
        });
        if (existing && existing.status !== enums_1.PreadmissionStatus.RECHAZADO) {
            return {
                active: true,
                message: 'Ya existe una preadmisión activa con este documento. Debe finalizar o ser rechazada antes de crear otra.',
                id: existing.id,
                status: existing.status,
            };
        }
        return { active: false };
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
    buildEntityFromDto(dto, patientId, attachmentPaths) {
        const row = {
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
            procedimientoEstudio: dto.procedimientoEstudio?.trim() || dto.diagnostico?.trim() || null,
            numerocotizacion: dto.numerocotizacion ?? null,
            cedulaimagen: attachmentPaths.cedulaimagen ?? null,
            ordenimagen: attachmentPaths.ordenimagen ?? null,
            preautorizacion: attachmentPaths.preautorizacion ?? null,
            carnetseguro: attachmentPaths.carnetseguro ?? null,
            certificadoSeguro: attachmentPaths.certificadoSeguro ?? null,
            ssimagen: attachmentPaths.ssimagen ?? null,
            patientId: patientId !== undefined && patientId !== null ? patientId : null,
            status: enums_1.PreadmissionStatus.ENVIADO,
            qrCode: this.generateQrCode(),
            arrivalState: enums_1.PreadmissionArrivalState.ESPERA_LLEGADA,
        };
        if (dto.doblecobertura === 'NO') {
            row.compania1 = 'PACIENTE PRIVADO';
            row.poliza1 = '';
            row.carnetseguro = null;
            row.certificadoSeguro = null;
        }
        else if (!dto.compania1 || !dto.poliza1) {
            throw new common_1.BadRequestException('Compañía y póliza son obligatorias cuando mantiene seguro');
        }
        return this.preadmissionRepository.create(row);
    }
    async create(createDto, patientId, uploadedFiles = {}) {
        this.assertNamesAndAddress(createDto);
        this.assertPhoneNumbers(createDto);
        const existing = await this.preadmissionRepository.findOne({
            where: { cedula: createDto.cedula, pasaporte: createDto.pasaporte },
            order: { fechapreadmision: 'DESC' },
        });
        if (existing && existing.status !== enums_1.PreadmissionStatus.RECHAZADO) {
            throw new common_1.BadRequestException('Ya existe una preadmisión activa con este documento');
        }
        const preadmission = this.buildEntityFromDto(createDto, patientId, {});
        const saved = await this.preadmissionRepository.save(preadmission);
        const attachmentPaths = this.storageService.saveAttachments(saved.id, uploadedFiles);
        for (const field of preadmission_attachments_constants_1.PREADMISSION_ATTACHMENT_FIELDS) {
            if (attachmentPaths[field]) {
                saved[field] = attachmentPaths[field];
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
            this.logger.error(`No se pudo enviar confirmación por correo (preadmisión #${saved.id})`, err);
        });
        return (0, preadmission_response_util_1.toPreadmissionResponse)(saved);
    }
    async getAttachment(id, field, user) {
        if (!this.storageService.isAttachmentField(field)) {
            throw new common_1.BadRequestException('Tipo de adjunto no válido');
        }
        const preadmission = await this.preadmissionRepository.findOne({ where: { id } });
        if (!preadmission) {
            throw new common_1.NotFoundException('Preadmisión no encontrada');
        }
        if (user.role === 'patient') {
            if (preadmission.patientId != null && preadmission.patientId !== user.id) {
                throw new common_1.ForbiddenException('No autorizado');
            }
        }
        const stored = preadmission[field];
        return this.storageService.openForDownload(stored, field);
    }
    async findAll(user, skip = 0, limit = 100) {
        const rows = user.role === 'patient'
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
        return rows.map(preadmission_response_util_1.toPreadmissionResponse);
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
        const rows = await qb.getMany();
        return rows.map(preadmission_response_util_1.toPreadmissionSummary);
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
        const saved = await this.preadmissionRepository.save(pre);
        return (0, preadmission_response_util_1.toPreadmissionResponse)(saved);
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
        return (0, preadmission_response_util_1.toPreadmissionResponse)(preadmission);
    }
    async findByCedula(cedula, tipoIdentificacion) {
        const row = await this.preadmissionRepository.findOne({
            where: { cedula, pasaporte: tipoIdentificacion },
            order: { fechapreadmision: 'DESC' },
        });
        return row ? (0, preadmission_response_util_1.toPreadmissionSummary)(row) : null;
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
        notifications_service_1.NotificationsService,
        preadmission_storage_service_1.PreadmissionStorageService])
], PreadmissionService);
//# sourceMappingURL=preadmission.service.js.map