import { Controller, Get, Query } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get('nacionalidades')
  async getNacionalidades() {
    return this.catalogsService.findAllNacionalidades();
  }

  @Get('provincias')
  async getProvincias() {
    return this.catalogsService.findAllProvincias();
  }

  @Get('distritos')
  async getDistritos(@Query('provincia') provinciaCodigo: string) {
    if (!provinciaCodigo) {
      return [];
    }
    return this.catalogsService.findDistritosByProvincia(provinciaCodigo);
  }

  @Get('corregimientos')
  async getCorregimientos(@Query('distrito') distritoCodigo: string) {
    if (!distritoCodigo) {
      return [];
    }
    return this.catalogsService.findCorregimientosByDistrito(distritoCodigo);
  }
}
