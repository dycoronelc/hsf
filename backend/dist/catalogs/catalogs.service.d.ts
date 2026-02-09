import { Repository } from 'typeorm';
import { Nacionalidad } from './entities/nacionalidad.entity';
import { Provincia } from './entities/provincia.entity';
import { Distrito } from './entities/distrito.entity';
import { Corregimiento } from './entities/corregimiento.entity';
export declare class CatalogsService {
    private nacionalidadRepository;
    private provinciaRepository;
    private distritoRepository;
    private corregimientoRepository;
    constructor(nacionalidadRepository: Repository<Nacionalidad>, provinciaRepository: Repository<Provincia>, distritoRepository: Repository<Distrito>, corregimientoRepository: Repository<Corregimiento>);
    findAllNacionalidades(): Promise<Nacionalidad[]>;
    findAllProvincias(): Promise<Provincia[]>;
    findDistritosByProvincia(provinciaCodigo: string): Promise<Distrito[]>;
    findCorregimientosByDistrito(distritoCodigo: string): Promise<Corregimiento[]>;
}
