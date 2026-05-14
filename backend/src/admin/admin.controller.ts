import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import {
  CreateMatrixRoleDto,
  CreateStaffUserDto,
  CreateTicketTypeDto,
  PatchMatrixRoleDto,
  UpdateRolePermissionsDto,
  UpdateStaffUserDto,
  UpdateTicketTypeDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
