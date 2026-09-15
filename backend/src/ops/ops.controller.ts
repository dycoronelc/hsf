import { Controller, Get, UseGuards } from '@nestjs/common';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';

@Controller('ops')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('view_ops')
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get('status')
  async status() {
    return this.opsService.getStatus();
  }
}
