import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Service } from './services/entities/service.entity';
import { Sede } from './services/entities/sede.entity';
import { Nacionalidad } from './catalogs/entities/nacionalidad.entity';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from './common/enums';
import * as fs from 'fs';
import * as path from 'path';
import { syncGeoCatalog } from './init/sync-geo-catalog';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const serviceRepository = app.get<Repository<Service>>(
    getRepositoryToken(Service),
  );
  const sedeRepository = app.get<Repository<Sede>>(getRepositoryToken(Sede));
  const nacionalidadRepository = app.get<Repository<Nacionalidad>>(
    getRepositoryToken(Nacionalidad),
  );
  const dataSource = app.get(DataSource);

  try {
    // Crear usuario admin
    let admin = await userRepository.findOne({
      where: { email: 'admin@hospitalsantafe.com' },
    });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = userRepository.create({
        email: 'admin@hospitalsantafe.com',
        hashedPassword,
        fullName: 'Administrador',
        role: UserRole.ADMIN,
        isActive: true,
      });
      await userRepository.save(admin);
      console.log('✓ Usuario admin creado: admin@hospitalsantafe.com / admin123');
    }

    // Crear usuario recepción
    let reception = await userRepository.findOne({
      where: { email: 'reception@hospitalsantafe.com' },
    });
    if (!reception) {
      const hashedPassword = await bcrypt.hash('reception123', 10);
      reception = userRepository.create({
        email: 'reception@hospitalsantafe.com',
        hashedPassword,
        fullName: 'Recepción',
        role: UserRole.RECEPTION,
        isActive: true,
      });
      await userRepository.save(reception);
      console.log(
        '✓ Usuario recepción creado: reception@hospitalsantafe.com / reception123',
      );
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
        role: UserRole.ANFITRION,
        isActive: true,
      });
      await userRepository.save(anfitrion);
      console.log(
        '✓ Usuario anfitrión creado: anfitrion@hospitalsantafe.com / anfitrion123',
      );
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
        role: UserRole.PATIENT,
        isActive: true,
      });
      await userRepository.save(patient);
      console.log(
        '✓ Usuario paciente creado: paciente@hospitalsantafe.com / Paciente123',
      );
    }

    // Crear sede principal
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

    // Crear servicios
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

    // Cargar nacionalidades desde CSV
    // El script se ejecuta desde backend/, así que buscamos en el directorio padre
    const nacionalidadesPath = path.join(process.cwd(), '..', 'nacionalidades.csv');
    if (fs.existsSync(nacionalidadesPath)) {
      const nacionalidadesContent = fs.readFileSync(nacionalidadesPath, 'utf-8');
      const nacionalidadesLines = nacionalidadesContent.split('\n').slice(1);
      
      for (const line of nacionalidadesLines) {
        if (!line.trim()) continue;
        const [codigo, nacionalidad, pais] = line.split(',').map(s => s.trim());
        if (!codigo || !nacionalidad || !pais) continue;
        
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
    } else {
      console.log('⚠ Archivo nacionalidades.csv no encontrado');
    }

    // Catálogo geo completo desde referencia TE (db/datosgeograficos_postgres.sql + migraciones).
    // Idempotente: puede re-ejecutarse con npm run backend:sync-geo en QA/prod existentes.
    await syncGeoCatalog(dataSource);

    console.log('\n✓ Datos inicializados correctamente');
  } catch (error) {
    console.error('✗ Error:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
