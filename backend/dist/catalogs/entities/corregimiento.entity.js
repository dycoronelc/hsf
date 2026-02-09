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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Corregimiento = void 0;
const typeorm_1 = require("typeorm");
const distrito_entity_1 = require("./distrito.entity");
let Corregimiento = class Corregimiento {
};
exports.Corregimiento = Corregimiento;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], Corregimiento.prototype, "codigo", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Corregimiento.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Corregimiento.prototype, "distritoCodigo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => distrito_entity_1.Distrito, (distrito) => distrito.corregimientos),
    (0, typeorm_1.JoinColumn)({ name: 'distritoCodigo' }),
    __metadata("design:type", distrito_entity_1.Distrito)
], Corregimiento.prototype, "distrito", void 0);
exports.Corregimiento = Corregimiento = __decorate([
    (0, typeorm_1.Entity)('corregimientos')
], Corregimiento);
//# sourceMappingURL=corregimiento.entity.js.map