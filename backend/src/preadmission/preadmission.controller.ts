import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Patch,
} from '@nestjs/common';
import { PreadmissionService } from './preadmission.service';
import {
  CreatePreadmissionDto,
  ReviewPreadmissionDto,
  ParseCedulaQrDto,
  RequestVerificationDto,
  ConfirmVerificationDto,
} from './dto/preadmission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, PreadmissionArrivalState } from '../common/enums';

@Controller('preadmission')
export class PreadmissionController {
  constructor(private readonly preadmissionService: PreadmissionService) {}

  /** Público: búsqueda por cédula para preadmisión sin login (validar duplicidad) */
  @Get('search')
  async searchByCedula(
    @Query('cedula') cedula: string,
    @Query('tipoIdentificacion') tipoIdentificacion: string,
  ) {
    if (!cedula || !tipoIdentificacion) {
      return null;
    }
    return this.preadmissionService.findByCedula(cedula, tipoIdentificacion);
  }

  /** Público: registro de preadmisión sin autenticación (según documento) */
  @Post('public')
  async createPublic(@Body() createDto: CreatePreadmissionDto) {
    return this.preadmissionService.create(createDto, null);
  }

  /** Público: parsear texto leído del QR de cédula (autollenado asistido) */
  @Post('parse-cedula-qr')
  async parseCedulaQr(@Body() body: ParseCedulaQrDto) {
    return this.preadmissionService.parseCedulaQrPayload(body.raw);
  }

  @Post('verify-contact/request')
  async requestContactVerification(@Body() body: RequestVerificationDto) {
    return this.preadmissionService.requestContactVerification(body.channel, body.destination);
  }

  @Post('verify-contact/confirm')
  async confirmContactVerification(@Body() body: ConfirmVerificationDto) {
    return this.preadmissionService.confirmContactVerification(
      body.channel,
      body.destination,
      body.code,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDto: CreatePreadmissionDto, @Request() req) {
    return this.preadmissionService.create(createDto, req.user.id);
  }

  @Get('work-list')
  @UseGuards(JwtAuthGuard)
  async workList(
    @Request() req,
    @Query('arrivalState') arrivalState?: PreadmissionArrivalState,
    @Query('q') q?: string,
    @Query('skip') skip?: number,
    @Query('limit') limit?: number,
  ) {
    return this.preadmissionService.findWorkList(req.user, {
      arrivalState,
      q,
      skip: skip ?? 0,
      limit: limit ?? 100,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('limit') limit?: number,
  ) {
    return this.preadmissionService.findAll(req.user, skip || 0, limit || 100);
  }

  @Patch(':id/confirm-arrival')
  @UseGuards(JwtAuthGuard)
  async confirmArrival(@Param('id') id: number, @Request() req) {
    return this.preadmissionService.confirmArrival(+id, req.user);
  }

  @Post(':id/activate-ticket')
  @UseGuards(JwtAuthGuard)
  async activateTicket(@Param('id') id: number, @Request() req) {
    return this.preadmissionService.activateTicket(+id, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: number, @Request() req) {
    return this.preadmissionService.findOne(+id, req.user);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.RECEPTION)
  async review(
    @Param('id') id: number,
    @Body() reviewDto: ReviewPreadmissionDto,
    @Request() req,
  ) {
    return this.preadmissionService.review(+id, reviewDto, req.user.id);
  }
}
