import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  async findAll(area?: string): Promise<Service[]> {
    const query = this.serviceRepository
      .createQueryBuilder('service')
      .where('service.isActive = :isActive', { isActive: true });

    if (area) {
      query.andWhere('service.area = :area', { area: area.toUpperCase() });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Service> {
    return this.serviceRepository.findOne({ where: { id } });
  }
}
