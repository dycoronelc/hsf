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
import { CreateTicketDto, UpdateTicketDto, CallTicketDto, CheckInByCodeDto } from './dto/ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, TicketStatus } from '../common/enums';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('kiosk')
  async createKioskTicket(@Body() createDto: CreateTicketDto) {
    // Endpoint público para kiosco - crea ticket sin autenticación
    return this.ticketsService.createKioskTicket(createDto);
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.RECEPTION, UserRole.TECHNICIAN, UserRole.SUPERVISOR)
  async call(
    @Param('id') id: number,
    @Body() callDto: CallTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.call(+id, callDto.windowNumber, req.user.id);
  }

  @Post(':id/start')
  async start(@Param('id') id: number) {
    return this.ticketsService.start(+id);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: number) {
    return this.ticketsService.complete(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: number, @Body() updateDto: UpdateTicketDto) {
    return this.ticketsService.update(+id, updateDto);
  }
}
