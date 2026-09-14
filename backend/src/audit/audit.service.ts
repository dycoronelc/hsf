import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { resolveReportDateRange, toPanamaOffsetIso } from '../common/timezone';

export type AuditLogOpts = {
  entityType?: string;
  entityId?: number;
  userId?: number;
  details?: string;
  ipAddress?: string | null;
  module?: string | null;
};

export type AuditQueryParams = {
  from?: string;
  to?: string;
  userId?: number;
  action?: string;
  module?: string;
  skip?: number;
  limit?: number;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async log(action: string, opts?: AuditLogOpts): Promise<void> {
    const row = this.auditRepository.create({
      action,
      entityType: opts?.entityType ?? null,
      entityId: opts?.entityId ?? null,
      userId: opts?.userId ?? null,
      details: opts?.details ?? null,
      ipAddress: opts?.ipAddress ?? null,
      module: opts?.module ?? null,
    });
    await this.auditRepository.save(row);
  }

  async find(params: AuditQueryParams) {
    const skip = Math.max(0, params.skip ?? 0);
    const limit = Math.min(500, Math.max(1, params.limit ?? 100));
    const qb = this.auditRepository
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (params.from?.trim() || params.to?.trim()) {
      const { start, end } = resolveReportDateRange(params.from, params.to, 30);
      qb.andWhere('a.createdAt >= :start AND a.createdAt <= :end', { start, end });
    }
    if (params.userId != null) {
      qb.andWhere('a.userId = :userId', { userId: params.userId });
    }
    if (params.action?.trim()) {
      qb.andWhere('a.action ILIKE :action', { action: `%${params.action.trim()}%` });
    }
    if (params.module?.trim()) {
      qb.andWhere('a.module ILIKE :module', { module: `%${params.module.trim()}%` });
    }

    const [rows, total] = await qb.getManyAndCount();
    const userIds = [...new Set(rows.map((r) => r.userId).filter((id): id is number => id != null))];
    const users =
      userIds.length > 0
        ? await this.userRepository.findBy({ id: In(userIds) })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      total,
      skip,
      limit,
      items: rows.map((r) => {
        const u = r.userId != null ? userMap.get(r.userId) : undefined;
        return {
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          userId: r.userId,
          userEmail: u?.email ?? null,
          userName: u?.fullName ?? null,
          details: r.details,
          ipAddress: r.ipAddress,
          module: r.module,
          createdAt: toPanamaOffsetIso(r.createdAt) ?? r.createdAt,
        };
      }),
    };
  }

  async exportExcel(params: AuditQueryParams): Promise<Buffer> {
    const result = await this.find({ ...params, skip: 0, limit: 5000 });
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bitácora');
    sheet.columns = [
      { header: 'Fecha/hora', key: 'createdAt', width: 22 },
      { header: 'Usuario', key: 'userName', width: 24 },
      { header: 'Email', key: 'userEmail', width: 28 },
      { header: 'IP', key: 'ipAddress', width: 16 },
      { header: 'Módulo', key: 'module', width: 18 },
      { header: 'Acción', key: 'action', width: 28 },
      { header: 'Entidad', key: 'entityType', width: 16 },
      { header: 'ID entidad', key: 'entityId', width: 12 },
      { header: 'Detalle', key: 'details', width: 48 },
    ];
    for (const item of result.items) {
      sheet.addRow({
        createdAt: item.createdAt,
        userName: item.userName,
        userEmail: item.userEmail,
        ipAddress: item.ipAddress,
        module: item.module,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        details: item.details,
      });
    }
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}

/** Extrae IP del request Express (respeta X-Forwarded-For detrás de nginx). */
export function clientIpFromRequest(req: {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string | null {
  const xf = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(xf) ? xf[0] : xf;
  if (raw?.trim()) {
    return raw.split(',')[0].trim().slice(0, 64);
  }
  const ip = req.ip || req.socket?.remoteAddress || null;
  return ip ? ip.slice(0, 64) : null;
}
