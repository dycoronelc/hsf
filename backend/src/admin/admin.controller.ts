import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('services')
  async createService(
    @Body('name') name: string,
    @Body('code') code: string,
    @Body('area') area: string,
    @Body('estimatedTime') estimatedTime?: number,
  ) {
    const service = await this.adminService.createService(
      name,
      code,
      area,
      estimatedTime,
    );
    return { message: 'Servicio creado', id: service.id };
  }
}
