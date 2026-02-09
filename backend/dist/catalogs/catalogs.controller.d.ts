import { CatalogsService } from './catalogs.service';
export declare class CatalogsController {
    private readonly catalogsService;
    constructor(catalogsService: CatalogsService);
    getNacionalidades(): Promise<import("./entities/nacionalidad.entity").Nacionalidad[]>;
    getProvincias(): Promise<import("./entities/provincia.entity").Provincia[]>;
    getDistritos(provinciaCodigo: string): Promise<import("./entities/distrito.entity").Distrito[]>;
    getCorregimientos(distritoCodigo: string): Promise<import("./entities/corregimiento.entity").Corregimiento[]>;
}
