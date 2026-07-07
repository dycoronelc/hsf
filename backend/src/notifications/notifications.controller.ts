import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { getSmtpConfigSummary } from './smtp.config';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Diagnóstico SMTP (admin / staff con permiso de revisión). */
  @Get('smtp/connectivity')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('review_preadmissions')
  async smtpConnectivity() {
    const result = await this.notificationsService.checkSmtpConnectivity();
    return {
      ...result,
      config: getSmtpConfigSummary(),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDto: CreateNotificationDto) {
    return this.notificationsService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req) {
    return this.notificationsService.findAll(req.user.id);
  }
}
