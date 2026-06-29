"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("./users/entities/user.entity");
const service_entity_1 = require("./services/entities/service.entity");
const sede_entity_1 = require("./services/entities/sede.entity");
const nacionalidad_entity_1 = require("./catalogs/entities/nacionalidad.entity");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const enums_1 = require("./common/enums");
const fs = require("fs");
const path = require("path");
const sync_geo_catalog_1 = require("./init/sync-geo-catalog");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const userRepository = app.get((0, typeorm_1.getRepositoryToken)(user_entity_1.User));
    const serviceRepository = app.get((0, typeorm_1.getRepositoryToken)(service_entity_1.Service));
    const sedeRepository = app.get((0, typeorm_1.getRepositoryToken)(sede_entity_1.Sede));
    const nacionalidadRepository = app.get((0, typeorm_1.getRepositoryToken)(nacionalidad_entity_1.Nacionalidad));
    const dataSource = app.get(typeorm_2.DataSource);
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
        let anfitrion = await userRepository.findOne({
            where: { email: 'anfitrion@hospitalsantafe.com' },
        });
        if (!anfitrion) {
            const hashedPassword = await bcrypt.hash('anfitrion123', 10);
            anfitrion = userRepository.create({
                email: 'anfitrion@hospitalsantafe.com',
                hashedPassword,
                fullName: 'Anfitrión',
                role: enums_1.UserRole.ANFITRION,
                isActive: true,
            });
            await userRepository.save(anfitrion);
            console.log('✓ Usuario anfitrión creado: anfitrion@hospitalsantafe.com / anfitrion123');
        }
        let patient = await userRepository.findOne({
            where: { email: 'paciente@hospitalsantafe.com' },
        });
        if (!patient) {
            const hashedPassword = await bcrypt.hash('Paciente123', 10);
            patient = userRepository.create({
                email: 'paciente@hospitalsantafe.com',
                hashedPassword,
                fullName: 'Paciente de Prueba',
                phone: '6000-0000',
                nationalId: '8-888-8888',
                birthDate: '1990-01-15',
                role: enums_1.UserRole.PATIENT,
                isActive: true,
            });
            await userRepository.save(patient);
            console.log('✓ Usuario paciente creado: paciente@hospitalsantafe.com / Paciente123');
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
            { name: 'Laboratorio Clínico', code: 'LAB', area: 'LAB', estimatedTime: 30, ticketPrefix: 'LR', priorityLevel: 2 },
            { name: 'Radiología General', code: 'RAD', area: 'RAD', estimatedTime: 45, ticketPrefix: 'LR', priorityLevel: 2 },
            { name: 'Tomografía', code: 'TOM', area: 'RAD', estimatedTime: 60, ticketPrefix: 'LR', priorityLevel: 2 },
            {
                name: 'Resonancia Magnética',
                code: 'RMN',
                area: 'RAD',
                estimatedTime: 90,
                ticketPrefix: 'LR',
                priorityLevel: 2,
            },
            { name: 'Ecografía', code: 'ECO', area: 'RAD', estimatedTime: 30, ticketPrefix: 'LR', priorityLevel: 2 },
            { name: 'Admisión', code: 'ADM', area: 'ADMISION', estimatedTime: 15, ticketPrefix: 'CTA', priorityLevel: 2 },
            { name: 'Hospitalización', code: 'HOSP', area: 'ADMISION', estimatedTime: 20, ticketPrefix: 'H', priorityLevel: 1 },
            { name: 'Copago / Ingreso PMSF', code: 'PMSF', area: 'ADMISION', estimatedTime: 15, ticketPrefix: 'PMSF', priorityLevel: 2 },
            { name: 'Cirugías / Endoscopias / Hemodinámica', code: 'CEH', area: 'ADMISION', estimatedTime: 25, ticketPrefix: 'CEH', priorityLevel: 1 },
            { name: 'Triage', code: 'TRIAGE', area: 'ADMISION', estimatedTime: 10, ticketPrefix: 'T', priorityLevel: 1 },
            { name: 'Urgencias', code: 'URG', area: 'ADMISION', estimatedTime: 10, ticketPrefix: 'URG', priorityLevel: 1 },
            { name: 'Consulta', code: 'CTA', area: 'ADMISION', estimatedTime: 20, ticketPrefix: 'CTA', priorityLevel: 2 },
            { name: 'Otros servicios', code: 'OT', area: 'ADMISION', estimatedTime: 15, ticketPrefix: 'OT', priorityLevel: 3 },
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
        await (0, sync_geo_catalog_1.syncGeoCatalog)(dataSource);
        console.log('\n✓ Datos inicializados correctamente');
    }
    catch (error) {
        console.error('✗ Error:', error);
        process.exitCode = 1;
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=init-data.js.map