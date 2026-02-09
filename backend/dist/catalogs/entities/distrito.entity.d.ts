import { Provincia } from './provincia.entity';
import { Corregimiento } from './corregimiento.entity';
export declare class Distrito {
    codigo: string;
    nombre: string;
    provinciaCodigo: string;
    provincia: Provincia;
    corregimientos: Corregimiento[];
}
