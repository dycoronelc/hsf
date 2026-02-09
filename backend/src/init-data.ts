import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Service } from './services/entities/service.entity';
import { Sede } from './services/entities/sede.entity';
import { Nacionalidad } from './catalogs/entities/nacionalidad.entity';
import { Provincia } from './catalogs/entities/provincia.entity';
import { Distrito } from './catalogs/entities/distrito.entity';
import { Corregimiento } from './catalogs/entities/corregimiento.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from './common/enums';
import * as fs from 'fs';
import * as path from 'path';

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
  const provinciaRepository = app.get<Repository<Provincia>>(
    getRepositoryToken(Provincia),
  );
  const distritoRepository = app.get<Repository<Distrito>>(
    getRepositoryToken(Distrito),
  );
  const corregimientoRepository = app.get<Repository<Corregimiento>>(
    getRepositoryToken(Corregimiento),
  );

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

    // Cargar ubicaciones geográficas desde CSV en 3 tablas relacionadas
    // El script se ejecuta desde backend/, así que buscamos en el directorio padre
    const ubicacionesPath = path.join(process.cwd(), '..', 'ubicacion_geo.csv');
    if (fs.existsSync(ubicacionesPath)) {
      const ubicacionesContent = fs.readFileSync(ubicacionesPath, 'utf-8');
      const ubicacionesLines = ubicacionesContent.split('\n').slice(1);
      
      const provinciasMap = new Map<string, Provincia>();
      const distritosMap = new Map<string, Distrito>();
      
      for (const line of ubicacionesLines) {
        if (!line.trim()) continue;
        const [pais, paisName, provinciaCodigo, provinciaName, distritoCodigo, distritoName, corregCode, corregimiento] = 
          line.split(',').map(s => s.trim());
        if (!corregCode || !corregimiento || !provinciaCodigo || !distritoCodigo) continue;
        
        // Crear o obtener Provincia
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
        const provincia = provinciasMap.get(provinciaCodigo)!;
        
        // Crear o obtener Distrito
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
        const distrito = distritosMap.get(distritoKey)!;
        
        // Crear Corregimiento
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
    } else {
      console.log('⚠ Archivo ubicacion_geo.csv no encontrado');
    }

    console.log('\n✓ Datos inicializados correctamente');
  } catch (error) {
    console.error('✗ Error:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
