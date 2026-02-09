import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../services/entities/service.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  async createService(
    name: string,
    code: string,
    area: string,
    estimatedTime?: number,
  ) {
    const service = this.serviceRepository.create({
      name,
      code,
      area: area.toUpperCase(),
      estimatedTime,
    });
    return this.serviceRepository.save(service);
  }
}
