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
import { CreateTicketDto, UpdateTicketDto, CallTicketDto, CheckInByCodeDto, TransferTicketDto } from './dto/ticket.dto';
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.RECEPTION,
    UserRole.TECHNICIAN,
    UserRole.SUPERVISOR,
    UserRole.OFICIAL_ADMISION,
    UserRole.LABORATORIO,
    UserRole.RADIOLOGIA,
  )
  async call(
    @Param('id') id: number,
    @Body() callDto: CallTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.call(+id, callDto.windowNumber, req.user);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.RECEPTION,
    UserRole.TECHNICIAN,
    UserRole.SUPERVISOR,
    UserRole.OFICIAL_ADMISION,
    UserRole.LABORATORIO,
    UserRole.RADIOLOGIA,
  )
  async start(@Param('id') id: number, @Request() req) {
    return this.ticketsService.start(+id, req.user);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.RECEPTION,
    UserRole.TECHNICIAN,
    UserRole.SUPERVISOR,
    UserRole.OFICIAL_ADMISION,
    UserRole.LABORATORIO,
    UserRole.RADIOLOGIA,
  )
  async complete(@Param('id') id: number, @Request() req) {
    return this.ticketsService.complete(+id, req.user);
  }

  @Post(':id/transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.RECEPTION,
    UserRole.TECHNICIAN,
    UserRole.SUPERVISOR,
    UserRole.LABORATORIO,
    UserRole.RADIOLOGIA,
    UserRole.OFICIAL_ADMISION,
  )
  async transfer(
    @Param('id') id: number,
    @Body() dto: TransferTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.transfer(+id, dto, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.RECEPTION,
    UserRole.TECHNICIAN,
    UserRole.SUPERVISOR,
    UserRole.OFICIAL_ADMISION,
    UserRole.LABORATORIO,
    UserRole.RADIOLOGIA,
  )
  async update(@Param('id') id: number, @Body() updateDto: UpdateTicketDto) {
    return this.ticketsService.update(+id, updateDto);
  }
}
