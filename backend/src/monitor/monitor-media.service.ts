import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonitorMedia } from './entities/monitor-media.entity';
import { CreateMonitorMediaDto, UpdateMonitorMediaDto } from '../admin/dto/monitor-media.dto';

@Injectable()
export class MonitorMediaService {
  constructor(
    @InjectRepository(MonitorMedia)
    private readonly mediaRepository: Repository<MonitorMedia>,
  ) {}

  listActive() {
    return this.mediaRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  listAll() {
    return this.mediaRepository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async create(dto: CreateMonitorMediaDto) {
    const row = this.mediaRepository.create({
      kind: dto.kind,
      title: dto.title.trim(),
      body: dto.body?.trim() || null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.mediaRepository.save(row);
  }

  async update(id: number, dto: UpdateMonitorMediaDto) {
    const row = await this.mediaRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Contenido no encontrado');
    if (dto.kind !== undefined) row.kind = dto.kind;
    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.body !== undefined) row.body = dto.body?.trim() || null;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    return this.mediaRepository.save(row);
  }

  async remove(id: number) {
    const row = await this.mediaRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Contenido no encontrado');
    await this.mediaRepository.delete({ id });
    return { ok: true };
  }
}
