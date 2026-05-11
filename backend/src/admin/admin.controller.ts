import {
  Body,
  Controller,
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import {
  CreateTicketTypeDto,
  UpdateRolePermissionsDto,
  UpdateStaffUserDto,
  UpdateTicketTypeDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('permission-catalog')
  getPermissionCatalog() {
    return this.adminService.getPermissionCatalog();
  }

  @Get('role-permissions')
  getRolePermissions() {
    return this.adminService.getRolePermissionsMatrix();
  }

  @Put('role-permissions')
  updateRolePermissions(@Body() dto: UpdateRolePermissionsDto, @Request() req) {
    return this.adminService.updateRolePermissions(dto, req.user.id);
  }

  @Get('ticket-types')
  listTicketTypes() {
    return this.adminService.listTicketTypes();
  }

  @Post('ticket-types')
  createTicketType(@Body() dto: CreateTicketTypeDto, @Request() req) {
    return this.adminService.createTicketType(dto, req.user.id);
  }

  @Patch('ticket-types/:id')
  updateTicketType(
    @Param('id') id: number,
    @Body() dto: UpdateTicketTypeDto,
    @Request() req,
  ) {
    return this.adminService.updateTicketType(+id, dto, req.user.id);
  }

  @Get('users')
  listStaffUsers() {
    return this.adminService.listStaffUsers();
  }

  @Patch('users/:id')
  updateStaffUser(
    @Param('id') id: number,
    @Body() dto: UpdateStaffUserDto,
    @Request() req,
  ) {
    return this.adminService.updateStaffUser(+id, dto, req.user.id);
  }

  /** Compatibilidad con endpoint anterior */
  @Post('services')
  async createService(
    @Body('name') name: string,
    @Body('code') code: string,
    @Body('area') area: string,
    @Body('estimatedTime') estimatedTime?: number,
    @Request() req?,
  ) {
    return this.adminService.createTicketType(
      { name, code, area, estimatedTime },
      req?.user?.id ?? 0,
    );
  }
}
