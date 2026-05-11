import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, PreadmissionArrivalState } from '../common/enums';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AUDITOR)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getSummaryReport(start, end);
  }

  @Get('realtime')
  async getRealTime() {
    return this.reportsService.getRealTimeReport();
  }

  @Get('efficiency')
  async getEfficiency(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getEfficiencyReport(start, end);
  }

  @Get('service/:serviceId')
  async getServiceReport(
    @Param('serviceId') serviceId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getServiceReport(+serviceId, start, end);
  }

  @Get('preadmissions')
  async getPreadmissionsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tipo') tipo?: string,
    @Query('documento') documento?: string,
    @Query('arrivalState') arrivalState?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const state = this.parseArrivalState(arrivalState);
    return this.reportsService.getPreadmissionsReport(start, end, tipo, documento, state);
  }

  @Get('preadmissions/export')
  async exportPreadmissions(
    @Query('format') format: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tipo') tipo?: string,
    @Query('documento') documento?: string,
    @Query('arrivalState') arrivalState?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const state = this.parseArrivalState(arrivalState);
    if (format === 'csv') {
      const csv = await this.reportsService.exportPreadmissionsCSV(start, end, tipo, documento, state);
      return { csv };
    }
    if (format === 'excel' || format === 'xlsx' || format === 'xls') {
      const excel = await this.reportsService.exportPreadmissionsExcel(start, end, tipo, documento, state);
      return { excel, mimeType: 'application/vnd.ms-excel' };
    }
    return this.reportsService.getPreadmissionsReport(start, end, tipo, documento, state);
  }

  private parseArrivalState(raw?: string): PreadmissionArrivalState | undefined {
    if (!raw) return undefined;
    return Object.values(PreadmissionArrivalState).includes(raw as PreadmissionArrivalState)
      ? (raw as PreadmissionArrivalState)
      : undefined;
  }
}
