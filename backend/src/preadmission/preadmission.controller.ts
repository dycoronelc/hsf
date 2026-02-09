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
import { CreatePreadmissionDto, ReviewPreadmissionDto } from './dto/preadmission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('preadmission')
@UseGuards(JwtAuthGuard)
export class PreadmissionController {
  constructor(private readonly preadmissionService: PreadmissionService) {}

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

  @Post()
  async create(@Body() createDto: CreatePreadmissionDto, @Request() req) {
    return this.preadmissionService.create(createDto, req.user.id);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('limit') limit?: number,
  ) {
    return this.preadmissionService.findAll(req.user, skip || 0, limit || 100);
  }

  @Get(':id')
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
