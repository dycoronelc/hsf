import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto, UpdateTicketDto, CallTicketDto, CheckInByCodeDto, TransferTicketDto, NoShowTicketDto } from './dto/ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { TicketStatus } from '../common/enums';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('kiosk')
  async createKioskTicket(@Body() createDto: CreateTicketDto) {
    return this.ticketsService.createKioskTicket(createDto);
  }

  @Post('host')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activate_ticket')
  async createHostWalkIn(@Body() createDto: CreateTicketDto, @Request() req) {
    return this.ticketsService.createHostWalkInTicket(createDto, req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDto: CreateTicketDto, @Request() req) {
    return this.ticketsService.create(createDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req,
    @Query('service_id') serviceId?: number,
    @Query('status') status?: TicketStatus,
  ) {
    return this.ticketsService.findAll(req.user, serviceId, status);
  }

  @Post('check-in-by-code')
  async checkInByCode(@Body() dto: CheckInByCodeDto) {
    return this.ticketsService.checkInByCode(dto.code);
  }

  @Post(':id/check-in')
  async checkIn(@Param('id') id: number) {
    return this.ticketsService.checkIn(+id);
  }

  @Post(':id/call')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff_call_ticket')
  async call(
    @Param('id') id: number,
    @Body() callDto: CallTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.call(+id, callDto.windowNumber, req.user);
  }

  @Post(':id/recall')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff_call_ticket')
  async recall(
    @Param('id') id: number,
    @Body() callDto: CallTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.recall(+id, callDto.windowNumber, req.user);
  }

  @Post(':id/no-show')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff_call_ticket')
  async noShow(
    @Param('id') id: number,
    @Body() dto: NoShowTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.markNoShow(+id, dto.reason, req.user);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff_call_ticket')
  async start(@Param('id') id: number, @Request() req) {
    return this.ticketsService.start(+id, req.user);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff_complete_ticket')
  async complete(@Param('id') id: number, @Request() req) {
    return this.ticketsService.complete(+id, req.user);
  }

  @Post(':id/transfer')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff_transfer_ticket')
  async transfer(
    @Param('id') id: number,
    @Body() dto: TransferTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.transfer(+id, dto, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff_check_in')
  async update(@Param('id') id: number, @Body() updateDto: UpdateTicketDto) {
    return this.ticketsService.update(+id, updateDto);
  }
}
