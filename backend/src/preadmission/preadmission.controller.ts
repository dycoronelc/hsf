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
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  StreamableFile,
  Header,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PreadmissionService } from './preadmission.service';
import {
  CreatePreadmissionDto,
  CreatePreadmissionBodyDto,
  ReviewPreadmissionDto,
  ParseCedulaQrDto,
  RequestVerificationDto,
  ConfirmVerificationDto,
} from './dto/preadmission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PreadmissionArrivalState } from '../common/enums';
import { PREADMISSION_ATTACHMENT_FIELDS } from './preadmission-attachments.constants';
import { memoryStorage } from 'multer';
import { MAX_ATTACHMENT_BYTES } from './preadmission-attachments.constants';
import { PreadmissionUploadedFilesMap } from './preadmission-upload.types';

const attachmentUpload = FileFieldsInterceptor(
  PREADMISSION_ATTACHMENT_FIELDS.map((name) => ({ name, maxCount: 1 })),
  {
    storage: memoryStorage(),
    limits: { fileSize: MAX_ATTACHMENT_BYTES },
  },
);

async function parseCreateBody(data: string | undefined): Promise<CreatePreadmissionBodyDto> {
  if (!data?.trim()) {
    throw new BadRequestException('Falta el campo "data" con los datos del formulario (JSON)');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new BadRequestException('El campo "data" no es un JSON válido');
  }
  const dto = plainToInstance(CreatePreadmissionDto, parsed);
  const errors = await validate(dto as object, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    const messages = errors.flatMap((e) =>
      e.constraints ? Object.values(e.constraints) : [`${e.property}: inválido`],
    );
    throw new BadRequestException(messages);
  }
  return dto;
}

@Controller('preadmission')
export class PreadmissionController {
  constructor(private readonly preadmissionService: PreadmissionService) {}

  @Get('check-active')
  async checkActiveDocument(
    @Query('cedula') cedula: string,
    @Query('pasaporte') pasaporte: string,
    @Query('departamento') departamento: string,
    @Query('fechaprobableatencion') fechaprobableatencion: string,
  ) {
    return this.preadmissionService.checkActiveDocument(
      cedula,
      pasaporte,
      departamento,
      fechaprobableatencion,
    );
  }

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

  @Post('public')
  @UseInterceptors(attachmentUpload)
  async createPublic(
    @Body('data') data: string,
    @UploadedFiles()
    files: PreadmissionUploadedFilesMap,
  ) {
    const createDto = await parseCreateBody(data);
    return this.preadmissionService.create(createDto, null, files);
  }

  @Post('parse-cedula-qr')
  async parseCedulaQr(@Body() body: ParseCedulaQrDto) {
    return this.preadmissionService.parseCedulaQrPayload(body.raw);
  }

  @Post('verify-contact/request')
  async requestContactVerification(@Body() body: RequestVerificationDto) {
    return this.preadmissionService.requestContactVerification(body.destination);
  }

  @Post('verify-contact/confirm')
  async confirmContactVerification(@Body() body: ConfirmVerificationDto) {
    return this.preadmissionService.confirmContactVerification(body.destination, body.code);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(attachmentUpload)
  async create(
    @Body('data') data: string,
    @UploadedFiles()
    files: PreadmissionUploadedFilesMap,
    @Request() req,
  ) {
    const createDto = await parseCreateBody(data);
    return this.preadmissionService.create(createDto, req.user.id, files);
  }

  @Get('work-list')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_host_work_list')
  async workList(
    @Request() req,
    @Query('arrivalState') arrivalState?: PreadmissionArrivalState,
    @Query('q') q?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip = 0,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit = 100,
  ) {
    return this.preadmissionService.findWorkList(req.user, {
      arrivalState,
      q,
      skip,
      limit,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip = 0,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit = 100,
  ) {
    return this.preadmissionService.findAll(req.user, skip, limit);
  }

  @Get(':id/attachments/:field')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, max-age=3600')
  async getAttachment(
    @Param('id') id: string,
    @Param('field') field: string,
    @Request() req,
  ): Promise<StreamableFile> {
    const { stream } = await this.preadmissionService.getAttachment(+id, field, req.user);
    return stream;
  }

  @Get(':id/cellbyte-payload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('review_preadmissions')
  async getCellbytePayload(@Param('id') id: string, @Request() req) {
    return this.preadmissionService.getCellbytePayload(+id, req.user);
  }

  @Patch(':id/confirm-arrival')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('confirm_arrival')
  async confirmArrival(@Param('id') id: number, @Request() req) {
    return this.preadmissionService.confirmArrival(+id, req.user);
  }

  @Post(':id/activate-ticket')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activate_ticket')
  async activateTicket(@Param('id') id: number, @Request() req) {
    return this.preadmissionService.activateTicket(+id, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: number, @Request() req) {
    return this.preadmissionService.findOne(+id, req.user);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('review_preadmissions')
  async review(
    @Param('id') id: number,
    @Body() reviewDto: ReviewPreadmissionDto,
    @Request() req,
  ) {
    return this.preadmissionService.review(+id, reviewDto, req.user.id);
  }
}
