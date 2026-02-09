import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAppointmentDto, CheckAvailabilityDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('check-availability')
  async checkAvailability(@Body() checkDto: CheckAvailabilityDto) {
    const isAvailable = await this.appointmentsService.checkAvailability(
      checkDto.serviceId,
      checkDto.date,
    );
    return { available: isAvailable };
  }

  @Get('available-slots')
  async getAvailableSlots(
    @Query('serviceId') serviceId: number,
    @Query('date') date: string,
  ) {
    const slots = await this.appointmentsService.getAvailableSlots(+serviceId, date);
    return { slots };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDto: CreateAppointmentDto, @Request() req) {
    return this.appointmentsService.create(req.user.id, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req) {
    return this.appointmentsService.findByPatient(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: number, @Request() req) {
    return this.appointmentsService.findOne(+id, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: number,
    @Body() updateDto: UpdateAppointmentDto,
    @Request() req,
  ) {
    return this.appointmentsService.update(+id, updateDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: number, @Request() req) {
    return this.appointmentsService.cancel(+id, req.user.id);
  }
}

