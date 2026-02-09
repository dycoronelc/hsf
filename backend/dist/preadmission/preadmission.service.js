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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreadmissionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const preadmission_entity_1 = require("./entities/preadmission.entity");
const enums_1 = require("../common/enums");
const crypto = require("crypto");
let PreadmissionService = class PreadmissionService {
    constructor(preadmissionRepository) {
        this.preadmissionRepository = preadmissionRepository;
    }
    generateQrCode() {
        return crypto.randomBytes(8).toString('hex').toUpperCase();
    }
    async create(createDto, patientId) {
        if (!createDto.cedulaimagen || !createDto.ordenimagen) {
            throw new common_1.BadRequestException('cedulaimagen y ordenimagen son obligatorios');
        }
        if (createDto.doblecobertura === 'SI') {
            if (!createDto.compania1 || !createDto.poliza1) {
                throw new common_1.BadRequestException('compania1 y poliza1 son obligatorios cuando doblecobertura es SI');
            }
        }
        const preadmission = this.preadmissionRepository.create({
            ...createDto,
            patientId,
            status: enums_1.PreadmissionStatus.ENVIADO,
            qrCode: this.generateQrCode(),
        });
        return this.preadmissionRepository.save(preadmission);
    }
    async findAll(user, skip = 0, limit = 100) {
        if (user.role === 'patient') {
            return this.preadmissionRepository.find({
                where: { patientId: user.id },
                skip,
                take: limit,
            });
        }
        return this.preadmissionRepository.find({ skip, take: limit });
    }
    async findOne(id, user) {
        const preadmission = await this.preadmissionRepository.findOne({ where: { id } });
        if (!preadmission) {
            throw new common_1.NotFoundException('Preadmisión no encontrada');
        }
        if (user.role === 'patient' && preadmission.patientId !== user.id) {
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
};
exports.PreadmissionService = PreadmissionService;
exports.PreadmissionService = PreadmissionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(preadmission_entity_1.Preadmission)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PreadmissionService);
//# sourceMappingURL=preadmission.service.js.map