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
exports.CatalogsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nacionalidad_entity_1 = require("./entities/nacionalidad.entity");
const provincia_entity_1 = require("./entities/provincia.entity");
const distrito_entity_1 = require("./entities/distrito.entity");
const corregimiento_entity_1 = require("./entities/corregimiento.entity");
let CatalogsService = class CatalogsService {
    constructor(nacionalidadRepository, provinciaRepository, distritoRepository, corregimientoRepository) {
        this.nacionalidadRepository = nacionalidadRepository;
        this.provinciaRepository = provinciaRepository;
        this.distritoRepository = distritoRepository;
        this.corregimientoRepository = corregimientoRepository;
    }
    async findAllNacionalidades() {
        return this.nacionalidadRepository.find({
            order: { nacionalidad: 'ASC' },
        });
    }
    async findAllProvincias() {
        return this.provinciaRepository.find({
            order: { nombre: 'ASC' },
        });
    }
    async findDistritosByProvincia(provinciaCodigo) {
        return this.distritoRepository.find({
            where: { provinciaCodigo },
            order: { nombre: 'ASC' },
        });
    }
    async findCorregimientosByDistrito(distritoCodigo) {
        return this.corregimientoRepository.find({
            where: { distritoCodigo },
            order: { nombre: 'ASC' },
        });
    }
};
exports.CatalogsService = CatalogsService;
exports.CatalogsService = CatalogsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(nacionalidad_entity_1.Nacionalidad)),
    __param(1, (0, typeorm_1.InjectRepository)(provincia_entity_1.Provincia)),
    __param(2, (0, typeorm_1.InjectRepository)(distrito_entity_1.Distrito)),
    __param(3, (0, typeorm_1.InjectRepository)(corregimiento_entity_1.Corregimiento)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CatalogsService);
//# sourceMappingURL=catalogs.service.js.map