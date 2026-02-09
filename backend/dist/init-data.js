"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("./users/entities/user.entity");
const service_entity_1 = require("./services/entities/service.entity");
const sede_entity_1 = require("./services/entities/sede.entity");
const nacionalidad_entity_1 = require("./catalogs/entities/nacionalidad.entity");
const provincia_entity_1 = require("./catalogs/entities/provincia.entity");
const distrito_entity_1 = require("./catalogs/entities/distrito.entity");
const corregimiento_entity_1 = require("./catalogs/entities/corregimiento.entity");
const bcrypt = require("bcrypt");
const enums_1 = require("./common/enums");
const fs = require("fs");
const path = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const userRepository = app.get((0, typeorm_1.getRepositoryToken)(user_entity_1.User));
    const serviceRepository = app.get((0, typeorm_1.getRepositoryToken)(service_entity_1.Service));
    const sedeRepository = app.get((0, typeorm_1.getRepositoryToken)(sede_entity_1.Sede));
    const nacionalidadRepository = app.get((0, typeorm_1.getRepositoryToken)(nacionalidad_entity_1.Nacionalidad));
    const provinciaRepository = app.get((0, typeorm_1.getRepositoryToken)(provincia_entity_1.Provincia));
    const distritoRepository = app.get((0, typeorm_1.getRepositoryToken)(distrito_entity_1.Distrito));
    const corregimientoRepository = app.get((0, typeorm_1.getRepositoryToken)(corregimiento_entity_1.Corregimiento));
    try {
        let admin = await userRepository.findOne({
            where: { email: 'admin@hospitalsantafe.com' },
        });
        if (!admin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            admin = userRepository.create({
                email: 'admin@hospitalsantafe.com',
                hashedPassword,
                fullName: 'Administrador',
                role: enums_1.UserRole.ADMIN,
                isActive: true,
            });
            await userRepository.save(admin);
            console.log('✓ Usuario admin creado: admin@hospitalsantafe.com / admin123');
        }
        let reception = await userRepository.findOne({
            where: { email: 'reception@hospitalsantafe.com' },
        });
        if (!reception) {
            const hashedPassword = await bcrypt.hash('reception123', 10);
            reception = userRepository.create({
                email: 'reception@hospitalsantafe.com',
                hashedPassword,
                fullName: 'Recepción',
                role: enums_1.UserRole.RECEPTION,
                isActive: true,
            });
            await userRepository.save(reception);
            console.log('✓ Usuario recepción creado: reception@hospitalsantafe.com / reception123');
        }
        let sede = await sedeRepository.findOne({
            where: { name: 'Sede Principal' },
        });
        if (!sede) {
            sede = sedeRepository.create({
                name: 'Sede Principal',
                address: 'Ciudad de Panamá',
                isActive: true,
            });
            await sedeRepository.save(sede);
            console.log('✓ Sede principal creada');
        }
        const servicesData = [
            { name: 'Laboratorio Clínico', code: 'LAB', area: 'LAB', estimatedTime: 30 },
            { name: 'Radiología General', code: 'RAD', area: 'RAD', estimatedTime: 45 },
            { name: 'Tomografía', code: 'TOM', area: 'RAD', estimatedTime: 60 },
            {
                name: 'Resonancia Magnética',
                code: 'RMN',
                area: 'RAD',
                estimatedTime: 90,
            },
            { name: 'Ecografía', code: 'ECO', area: 'RAD', estimatedTime: 30 },
            { name: 'Admisión', code: 'ADM', area: 'ADMISION', estimatedTime: 15 },
        ];
        for (const serviceData of servicesData) {
            const existing = await serviceRepository.findOne({
                where: { code: serviceData.code },
            });
            if (!existing) {
                const service = serviceRepository.create({
                    ...serviceData,
                    sedeId: sede.id,
                    isActive: true,
                });
                await serviceRepository.save(service);
                console.log(`✓ Servicio creado: ${serviceData.name}`);
            }
        }
        const nacionalidadesPath = path.join(process.cwd(), '..', 'nacionalidades.csv');
        if (fs.existsSync(nacionalidadesPath)) {
            const nacionalidadesContent = fs.readFileSync(nacionalidadesPath, 'utf-8');
            const nacionalidadesLines = nacionalidadesContent.split('\n').slice(1);
            for (const line of nacionalidadesLines) {
                if (!line.trim())
                    continue;
                const [codigo, nacionalidad, pais] = line.split(',').map(s => s.trim());
                if (!codigo || !nacionalidad || !pais)
                    continue;
                const existing = await nacionalidadRepository.findOne({
                    where: { codigo },
                });
                if (!existing) {
                    const nacionalidadEntity = nacionalidadRepository.create({
                        codigo,
                        nacionalidad,
                        pais,
                    });
                    await nacionalidadRepository.save(nacionalidadEntity);
                }
            }
            console.log('✓ Nacionalidades cargadas desde CSV');
        }
        else {
            console.log('⚠ Archivo nacionalidades.csv no encontrado');
        }
        const ubicacionesPath = path.join(process.cwd(), '..', 'ubicacion_geo.csv');
        if (fs.existsSync(ubicacionesPath)) {
            const ubicacionesContent = fs.readFileSync(ubicacionesPath, 'utf-8');
            const ubicacionesLines = ubicacionesContent.split('\n').slice(1);
            const provinciasMap = new Map();
            const distritosMap = new Map();
            for (const line of ubicacionesLines) {
                if (!line.trim())
                    continue;
                const [pais, paisName, provinciaCodigo, provinciaName, distritoCodigo, distritoName, corregCode, corregimiento] = line.split(',').map(s => s.trim());
                if (!corregCode || !corregimiento || !provinciaCodigo || !distritoCodigo)
                    continue;
                if (!provinciasMap.has(provinciaCodigo)) {
                    let provincia = await provinciaRepository.findOne({
                        where: { codigo: provinciaCodigo },
                    });
                    if (!provincia) {
                        provincia = provinciaRepository.create({
                            codigo: provinciaCodigo,
                            nombre: provinciaName,
                        });
                        provincia = await provinciaRepository.save(provincia);
                    }
                    provinciasMap.set(provinciaCodigo, provincia);
                }
                const provincia = provinciasMap.get(provinciaCodigo);
                const distritoKey = `${provinciaCodigo}-${distritoCodigo}`;
                if (!distritosMap.has(distritoKey)) {
                    let distrito = await distritoRepository.findOne({
                        where: { codigo: distritoCodigo, provinciaCodigo },
                    });
                    if (!distrito) {
                        distrito = distritoRepository.create({
                            codigo: distritoCodigo,
                            nombre: distritoName,
                            provinciaCodigo: provinciaCodigo,
                        });
                        distrito = await distritoRepository.save(distrito);
                    }
                    distritosMap.set(distritoKey, distrito);
                }
                const distrito = distritosMap.get(distritoKey);
                const existingCorregimiento = await corregimientoRepository.findOne({
                    where: { codigo: corregCode },
                });
                if (!existingCorregimiento) {
                    const corregimientoEntity = corregimientoRepository.create({
                        codigo: corregCode,
                        nombre: corregimiento,
                        distritoCodigo: distritoCodigo,
                    });
                    await corregimientoRepository.save(corregimientoEntity);
                }
            }
            console.log('✓ Ubicaciones geográficas cargadas desde CSV (Provincias, Distritos, Corregimientos)');
        }
        else {
            console.log('⚠ Archivo ubicacion_geo.csv no encontrado');
        }
        console.log('\n✓ Datos inicializados correctamente');
    }
    catch (error) {
        console.error('✗ Error:', error);
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=init-data.js.map