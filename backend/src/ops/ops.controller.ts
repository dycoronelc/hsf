import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { OpsService } from './ops.service';
import { CellbyteService } from '../integrations/cellbyte.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';

@Controller('ops')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('view_ops')
export class OpsController {
  constructor(
    private readonly opsService: OpsService,
    private readonly cellbyteService: CellbyteService,
  ) {}

  @Get('status')
  async status() {
    return this.opsService.getStatus();
  }

  @Get('cellbyte-logs')
  async cellbyteLogs(
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('success') success?: string,
  ) {
    const successFilter =
      success === 'true' ? true : success === 'false' ? false : undefined;
    return this.cellbyteService.listLogs({
      skip: skip != null && skip !== '' ? Number(skip) : 0,
      limit: limit != null && limit !== '' ? Number(limit) : 50,
      success: successFilter,
    });
  }

  @Get('cellbyte-logs/:id')
  async cellbyteLog(@Param('id', ParseIntPipe) id: number) {
    return this.cellbyteService.getLog(id);
  }
}
