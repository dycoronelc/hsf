import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nacionalidad } from './entities/nacionalidad.entity';
import { Provincia } from './entities/provincia.entity';
import { Distrito } from './entities/distrito.entity';
import { Corregimiento } from './entities/corregimiento.entity';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(Nacionalidad)
    private nacionalidadRepository: Repository<Nacionalidad>,
    @InjectRepository(Provincia)
    private provinciaRepository: Repository<Provincia>,
    @InjectRepository(Distrito)
    private distritoRepository: Repository<Distrito>,
    @InjectRepository(Corregimiento)
    private corregimientoRepository: Repository<Corregimiento>,
  ) {}

  async findAllNacionalidades(): Promise<Nacionalidad[]> {
    return this.nacionalidadRepository.find({
      order: { nacionalidad: 'ASC' },
    });
  }

  async findAllProvincias(): Promise<Provincia[]> {
    return this.provinciaRepository.find({
      order: { nombre: 'ASC' },
    });
  }

  async findDistritosByProvincia(provinciaCodigo: string): Promise<Distrito[]> {
    return this.distritoRepository.find({
      where: { provinciaCodigo },
      order: { nombre: 'ASC' },
    });
  }

  async findCorregimientosByDistrito(distritoCodigo: string): Promise<Corregimiento[]> {
    return this.corregimientoRepository.find({
      where: { distritoCodigo },
      order: { nombre: 'ASC' },
    });
  }
}
