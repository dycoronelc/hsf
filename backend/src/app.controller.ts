import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { CellbyteService } from './integrations/cellbyte.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cellbyteService: CellbyteService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return { status: 'healthy' };
  }

  /** Diagnóstico público: alcance de red hacia Cellbyte (sin JWT). */
  @Get('health/cellbyte')
  getCellbyteConnectivity() {
    return this.cellbyteService.checkConnectivity();
  }
}
