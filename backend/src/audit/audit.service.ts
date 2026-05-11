import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(
    action: string,
    opts?: { entityType?: string; entityId?: number; userId?: number; details?: string },
  ): Promise<void> {
    const row = this.auditRepository.create({
      action,
      entityType: opts?.entityType ?? null,
      entityId: opts?.entityId ?? null,
      userId: opts?.userId ?? null,
      details: opts?.details ?? null,
    });
    await this.auditRepository.save(row);
  }
}
