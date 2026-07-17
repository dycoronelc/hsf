import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import {
  CreateMatrixRoleDto,
  CreateStaffUserDto,
  CreateTicketTypeDto,
  PatchMatrixRoleDto,
  UpdatePatientDto,
  UpdateRolePermissionsDto,
  UpdateStaffUserDto,
  UpdateTicketTypeDto,
} from './dto/admin.dto';
import { CreateMonitorMediaDto, UpdateMonitorMediaDto } from './dto/monitor-media.dto';
import { UpdateCallTimingsDto } from './dto/call-timings.dto';
import { MonitorMediaService } from '../monitor/monitor-media.service';
import { SettingsService } from '../settings/settings.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly monitorMediaService: MonitorMediaService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('permission-catalog')
  @RequirePermissions('manage_role_permissions')
  getPermissionCatalog() {
    return this.adminService.getPermissionCatalog();
  }

  @Get('role-permissions')
  @RequirePermissions('manage_role_permissions')
  getRolePermissions() {
    return this.adminService.getRolePermissionsMatrix();
  }

  @Put('role-permissions')
  @RequirePermissions('manage_role_permissions')
  updateRolePermissions(@Body() dto: UpdateRolePermissionsDto, @Request() req) {
    return this.adminService.updateRolePermissions(dto, req.user.id);
  }

  @Post('role-matrix/roles')
  @RequirePermissions('manage_role_permissions')
  addRoleToMatrix(@Body() dto: CreateMatrixRoleDto, @Request() req) {
    return this.adminService.addRoleToMatrix(dto, req.user.id);
  }

  @Patch('role-matrix/roles/:role')
  @RequirePermissions('manage_role_permissions')
  patchMatrixRole(
    @Param('role') role: string,
    @Body() dto: PatchMatrixRoleDto,
    @Request() req,
  ) {
    return this.adminService.patchMatrixRole(role, dto, req.user.id);
  }

  @Delete('role-matrix/roles/:role')
  @RequirePermissions('manage_role_permissions')
  removeRoleFromMatrix(@Param('role') role: string, @Request() req) {
    return this.adminService.removeRoleFromMatrix(role, req.user.id);
  }

  @Get('ticket-types')
  @RequirePermissions('manage_ticket_types')
  listTicketTypes() {
    return this.adminService.listTicketTypes();
  }

  @Post('ticket-types')
  @RequirePermissions('manage_ticket_types')
  createTicketType(@Body() dto: CreateTicketTypeDto, @Request() req) {
    return this.adminService.createTicketType(dto, req.user.id);
  }

  @Patch('ticket-types/:id')
  @RequirePermissions('manage_ticket_types')
  updateTicketType(
    @Param('id') id: number,
    @Body() dto: UpdateTicketTypeDto,
    @Request() req,
  ) {
    return this.adminService.updateTicketType(+id, dto, req.user.id);
  }

  @Delete('ticket-types/:id')
  @RequirePermissions('manage_ticket_types')
  deleteTicketType(@Param('id') id: number, @Request() req) {
    return this.adminService.deleteTicketType(+id, req.user.id);
  }

  @Get('users')
  @RequirePermissions('manage_users')
  listStaffUsers() {
    return this.adminService.listStaffUsers();
  }

  @Post('users')
  @RequirePermissions('manage_users')
  createStaffUser(@Body() dto: CreateStaffUserDto, @Request() req) {
    return this.adminService.createStaffUser(dto, req.user.id);
  }

  @Patch('users/:id')
  @RequirePermissions('manage_users')
  updateStaffUser(
    @Param('id') id: number,
    @Body() dto: UpdateStaffUserDto,
    @Request() req,
  ) {
    return this.adminService.updateStaffUser(+id, dto, req.user.id);
  }

  @Delete('users/:id')
  @RequirePermissions('manage_users')
  deleteStaffUser(@Param('id') id: number, @Request() req) {
    return this.adminService.deleteStaffUser(+id, req.user.id);
  }

  @Get('patients')
  @RequirePermissions('manage_users')
  listPatients(@Query('q') q?: string) {
    return this.adminService.listPatients(q);
  }

  @Get('call-timings')
  @RequirePermissions('manage_ticket_types')
  getCallTimings() {
    return this.settingsService.getCallTimings();
  }

  @Patch('call-timings')
  @RequirePermissions('manage_ticket_types')
  updateCallTimings(@Body() dto: UpdateCallTimingsDto) {
    return this.settingsService.updateCallTimings(dto);
  }

  @Patch('patients/:id')
  @RequirePermissions('manage_users')
  updatePatient(@Param('id') id: number, @Body() dto: UpdatePatientDto, @Request() req) {
    return this.adminService.updatePatient(+id, dto, req.user.id);
  }

  @Get('monitor-media')
  @RequirePermissions('manage_users')
  listMonitorMedia() {
    return this.monitorMediaService.listAll();
  }

  @Post('monitor-media')
  @RequirePermissions('manage_users')
  createMonitorMedia(@Body() dto: CreateMonitorMediaDto) {
    return this.monitorMediaService.create(dto);
  }

  @Post('monitor-media/upload')
  @RequirePermissions('manage_users')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 80 * 1024 * 1024 },
    }),
  )
  uploadMonitorMedia(
    @UploadedFile()
    file: { buffer: Buffer; mimetype?: string; originalname?: string; size: number } | undefined,
    @Body('kind') kind: string,
    @Body('title') title: string,
    @Body('isActive') isActive?: string,
    @Body('sortOrder') sortOrder?: string,
  ) {
    if (kind !== 'image' && kind !== 'video') {
      throw new BadRequestException('La subida de archivos solo aplica a imagen o video');
    }
    if (!title?.trim()) {
      throw new BadRequestException('El título es obligatorio');
    }
    if (!file) {
      throw new BadRequestException('Debe seleccionar un archivo');
    }
    return this.monitorMediaService.createWithUpload(
      {
        kind,
        title: title.trim(),
        isActive: isActive === undefined ? true : isActive === 'true' || isActive === '1',
        sortOrder: sortOrder !== undefined ? Number(sortOrder) || 0 : 0,
      },
      file,
    );
  }

  @Patch('monitor-media/:id')
  @RequirePermissions('manage_users')
  updateMonitorMedia(@Param('id') id: number, @Body() dto: UpdateMonitorMediaDto) {
    return this.monitorMediaService.update(+id, dto);
  }

  @Delete('monitor-media/:id')
  @RequirePermissions('manage_users')
  deleteMonitorMedia(@Param('id') id: number) {
    return this.monitorMediaService.remove(+id);
  }

  /** Compatibilidad con endpoint anterior */
  @Post('services')
  @RequirePermissions('manage_ticket_types')
  async createService(
    @Request() req: { user: { id: number } },
    @Body('name') name: string,
    @Body('code') code: string,
    @Body('area') area: string,
    @Body('estimatedTime') estimatedTime?: number,
  ) {
    return this.adminService.createTicketType(
      { name, code, area, estimatedTime },
      req.user.id,
    );
  }
}
