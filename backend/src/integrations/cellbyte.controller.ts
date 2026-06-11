import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { CellbyteService } from './cellbyte.service';

@Controller('integrations/cellbyte')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CellbyteController {
  constructor(private readonly cellbyteService: CellbyteService) {}

  /** Verifica si el backend puede alcanzar el API de Cellbyte (red + credenciales). */
  @Get('connectivity')
  @RequirePermissions('review_preadmissions')
  checkConnectivity() {
    return this.cellbyteService.checkConnectivity();
  }
}
