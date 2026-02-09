import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Preadmission } from './entities/preadmission.entity';
import { CreatePreadmissionDto, ReviewPreadmissionDto } from './dto/preadmission.dto';
import { PreadmissionStatus } from '../common/enums';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class PreadmissionService {
  constructor(
    @InjectRepository(Preadmission)
    private preadmissionRepository: Repository<Preadmission>,
  ) {}

  private generateQrCode(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  async create(createDto: CreatePreadmissionDto, patientId: number): Promise<Preadmission> {
    // Validar campos obligatorios
    if (!createDto.cedulaimagen || !createDto.ordenimagen) {
      throw new BadRequestException('cedulaimagen y ordenimagen son obligatorios');
    }

    // Validar doble cobertura
    if (createDto.doblecobertura === 'SI') {
      if (!createDto.compania1 || !createDto.poliza1) {
        throw new BadRequestException(
          'compania1 y poliza1 son obligatorios cuando doblecobertura es SI',
        );
      }
    }

    const preadmission = this.preadmissionRepository.create({
      ...createDto,
      patientId,
      status: PreadmissionStatus.ENVIADO,
      qrCode: this.generateQrCode(),
    });

    return this.preadmissionRepository.save(preadmission);
  }

  async findAll(user: User, skip = 0, limit = 100): Promise<Preadmission[]> {
    if (user.role === 'patient') {
      return this.preadmissionRepository.find({
        where: { patientId: user.id },
        skip,
        take: limit,
      });
    }
    return this.preadmissionRepository.find({ skip, take: limit });
  }

  async findOne(id: number, user: User): Promise<Preadmission> {
    const preadmission = await this.preadmissionRepository.findOne({ where: { id } });
    if (!preadmission) {
      throw new NotFoundException('Preadmisión no encontrada');
    }
    if (user.role === 'patient' && preadmission.patientId !== user.id) {
      throw new ForbiddenException('No autorizado');
    }
    return preadmission;
  }

  async findByCedula(cedula: string, tipoIdentificacion: string): Promise<Preadmission | null> {
    return this.preadmissionRepository.findOne({
      where: { cedula, pasaporte: tipoIdentificacion },
      order: { fechapreadmision: 'DESC' },
    });
  }

  async review(
    id: number,
    reviewDto: ReviewPreadmissionDto,
    reviewerId: number,
  ): Promise<{ message: string; status: PreadmissionStatus }> {
    const preadmission = await this.preadmissionRepository.findOne({ where: { id } });
    if (!preadmission) {
      throw new NotFoundException('Preadmisión no encontrada');
    }

    preadmission.status = reviewDto.status;
    preadmission.observaciones = reviewDto.observaciones;
    preadmission.reviewedBy = reviewerId;
    preadmission.reviewedAt = new Date();

    await this.preadmissionRepository.save(preadmission);
    return { message: 'Preadmisión actualizada', status: reviewDto.status };
  }
}
