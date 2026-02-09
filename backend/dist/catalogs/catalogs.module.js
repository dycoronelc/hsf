"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const catalogs_service_1 = require("./catalogs.service");
const catalogs_controller_1 = require("./catalogs.controller");
const nacionalidad_entity_1 = require("./entities/nacionalidad.entity");
const provincia_entity_1 = require("./entities/provincia.entity");
const distrito_entity_1 = require("./entities/distrito.entity");
const corregimiento_entity_1 = require("./entities/corregimiento.entity");
let CatalogsModule = class CatalogsModule {
};
exports.CatalogsModule = CatalogsModule;
exports.CatalogsModule = CatalogsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([nacionalidad_entity_1.Nacionalidad, provincia_entity_1.Provincia, distrito_entity_1.Distrito, corregimiento_entity_1.Corregimiento])],
        providers: [catalogs_service_1.CatalogsService],
        controllers: [catalogs_controller_1.CatalogsController],
        exports: [catalogs_service_1.CatalogsService],
    })
], CatalogsModule);
//# sourceMappingURL=catalogs.module.js.map