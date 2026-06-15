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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const enums_1 = require("../common/enums");
const normalize_document_id_1 = require("../preadmission/utils/normalize-document-id");
const bcrypt = require("bcrypt");
let UsersService = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    async registerPublicPatient(dto) {
        return this.create({
            email: dto.email,
            password: dto.password,
            fullName: dto.fullName,
            phone: dto.phone,
            nationalId: dto.nationalId,
            birthDate: dto.birthDate,
            role: enums_1.UserRole.PATIENT,
        });
    }
    async create(createUserDto) {
        const existingEmail = await this.findByEmail(createUserDto.email);
        if (existingEmail) {
            throw new common_1.ConflictException('Ya existe una cuenta con este correo electrónico');
        }
        if (createUserDto.nationalId) {
            const normalizedNationalId = (0, normalize_document_id_1.normalizeDocumentId)(createUserDto.nationalId, 'C');
            const existingId = await this.usersRepository.findOne({
                where: { nationalId: normalizedNationalId },
            });
            if (existingId) {
                throw new common_1.ConflictException('Ya existe una cuenta con este número de identificación');
            }
            createUserDto.nationalId = normalizedNationalId;
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const user = this.usersRepository.create({
            email: createUserDto.email.trim().toLowerCase(),
            fullName: createUserDto.fullName,
            phone: createUserDto.phone,
            nationalId: createUserDto.nationalId ?? null,
            birthDate: createUserDto.birthDate ?? null,
            role: createUserDto.role ?? enums_1.UserRole.PATIENT,
            hashedPassword,
        });
        const savedUser = await this.usersRepository.save(user);
        return {
            id: savedUser.id,
            email: savedUser.email,
            fullName: savedUser.fullName,
            role: savedUser.role,
            isActive: savedUser.isActive,
        };
    }
    async findByEmail(email) {
        const normalized = email.trim().toLowerCase();
        if (!normalized)
            return null;
        return this.usersRepository
            .createQueryBuilder('user')
            .where('LOWER(user.email) = :email', { email: normalized })
            .getOne();
    }
    async updateAgentState(userId, agentState) {
        await this.usersRepository.update(userId, { agentState });
    }
    async updatePassword(userId, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await this.usersRepository.update(userId, { hashedPassword });
    }
    async findOne(id) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user)
            return null;
        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map