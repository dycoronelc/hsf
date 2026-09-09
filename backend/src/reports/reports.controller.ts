import { Controller, Get, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ReportsService, TicketReportFilters } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PreadmissionArrivalState } from '../common/enums';
import { IsArray, IsInt, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SlaParameterItemDto {
  @IsInt()
  serviceId: number;

  @IsNumber()
  @Min(1)
  @Max(480)
  slaWaitMinutes: number;

  @IsNumber()
  @Min(1)
  @Max(480)
  slaAttentionMinutes: number;
}

class UpdateSlaParametersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlaParameterItemDto)
  items: SlaParameterItemDto[];
}

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private parseTicketFilters(query: {
    serviceId?: string;
    serviceCode?: string;
    windowNumber?: string;
    agentId?: string;
  }): TicketReportFilters {
    const serviceIdRaw = query.serviceId != null && query.serviceId !== '' ? Number(query.serviceId) : undefined;
    const agentIdRaw = query.agentId != null && query.agentId !== '' ? Number(query.agentId) : undefined;
    return {
      serviceId: serviceIdRaw != null && !Number.isNaN(serviceIdRaw) ? serviceIdRaw : undefined,
      serviceCode: query.serviceCode?.trim() || undefined,
      windowNumber: query.windowNumber?.trim() || undefined,
      agentId: agentIdRaw != null && !Number.isNaN(agentIdRaw) ? agentIdRaw : undefined,
    };
  }

  @Get('agents')
  @RequirePermissions('view_reports')
  async listAgents() {
    return this.reportsService.listReportAgents();
  }

  @Get('sla-parameters')
  @RequirePermissions('view_reports')
  async listSlaParameters() {
    return this.reportsService.listSlaParameters();
  }

  @Put('sla-parameters')
  @RequirePermissions('view_reports')
  async updateSlaParameters(@Body() dto: UpdateSlaParametersDto) {
    return this.reportsService.updateSlaParameters(dto.items || []);
  }

  @Get('summary')
  @RequirePermissions('view_reports')
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceId') serviceId?: string,
    @Query('serviceCode') serviceCode?: string,
    @Query('windowNumber') windowNumber?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.reportsService.getSummaryReport(
      startDate,
      endDate,
      this.parseTicketFilters({ serviceId, serviceCode, windowNumber, agentId }),
    );
  }

  @Get('realtime')
  @RequirePermissions('view_reports')
  async getRealTime(
    @Query('serviceId') serviceId?: string,
    @Query('serviceCode') serviceCode?: string,
    @Query('windowNumber') windowNumber?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.reportsService.getRealTimeReport(
      this.parseTicketFilters({ serviceId, serviceCode, windowNumber, agentId }),
    );
  }

  @Get('efficiency')
  @RequirePermissions('view_reports')
  async getEfficiency(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceId') serviceId?: string,
    @Query('serviceCode') serviceCode?: string,
    @Query('windowNumber') windowNumber?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.reportsService.getEfficiencyReport(
      startDate,
      endDate,
      this.parseTicketFilters({ serviceId, serviceCode, windowNumber, agentId }),
    );
  }

  @Get('service/:serviceId')
  @RequirePermissions('view_reports')
  async getServiceReport(
    @Param('serviceId') serviceId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('windowNumber') windowNumber?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.reportsService.getServiceReport(+serviceId, startDate, endDate, {
      windowNumber: windowNumber?.trim() || undefined,
      agentId: agentId != null && agentId !== '' && !Number.isNaN(Number(agentId)) ? Number(agentId) : undefined,
    });
  }

  @Get('preadmissions')
  @RequirePermissions('view_reports')
  async getPreadmissionsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tipo') tipo?: string,
    @Query('documento') documento?: string,
    @Query('arrivalState') arrivalState?: string,
  ) {
    const state = this.parseArrivalState(arrivalState);
    return this.reportsService.getPreadmissionsReport(startDate, endDate, tipo, documento, state);
  }

  @Get('preadmissions/export')
  @RequirePermissions('export_reports')
  async exportPreadmissions(
    @Query('format') format: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tipo') tipo?: string,
    @Query('documento') documento?: string,
    @Query('arrivalState') arrivalState?: string,
  ) {
    const state = this.parseArrivalState(arrivalState);
    if (format === 'csv') {
      const csv = await this.reportsService.exportPreadmissionsCSV(
        startDate,
        endDate,
        tipo,
        documento,
        state,
      );
      return { csv };
    }
    if (format === 'excel' || format === 'xlsx' || format === 'xls') {
      const excel = await this.reportsService.exportPreadmissionsExcel(
        startDate,
        endDate,
        tipo,
        documento,
        state,
      );
      return { excel, mimeType: 'application/vnd.ms-excel' };
    }
    return this.reportsService.getPreadmissionsReport(startDate, endDate, tipo, documento, state);
  }

  private parseArrivalState(raw?: string): PreadmissionArrivalState | undefined {
    if (!raw) return undefined;
    return Object.values(PreadmissionArrivalState).includes(raw as PreadmissionArrivalState)
      ? (raw as PreadmissionArrivalState)
      : undefined;
  }
}
