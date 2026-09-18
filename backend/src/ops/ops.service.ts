import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../common/enums';
import { toPanamaOffsetIso } from '../common/timezone';

const execFileAsync = promisify(execFile);

export type OpsAlertLevel = 'ok' | 'warn' | 'critical';

export type OpsAlert = {
  level: OpsAlertLevel;
  code: string;
  message: string;
};

type OpsStatusPayload = {
  generatedAt: string;
  host: {
    hostname: string;
    platform: string;
    release: string;
    arch: string;
    uptimeSeconds: number;
  };
  process: {
    pid: number;
    nodeVersion: string;
    uptimeSeconds: number;
    startedAtApprox: string | null;
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
    externalBytes: number;
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    totalMb: number;
    freeMb: number;
    usedMb: number;
    usedPercent: number;
  };
  cpu: {
    cores: number;
    load1: number;
    load5: number;
    load15: number;
  };
  disk: {
    available: boolean;
    mounts: Array<{
      filesystem: string;
      mount: string;
      totalMb: number;
      usedMb: number;
      availableMb: number;
      usedPercent: number;
    }>;
    error: string | null;
  };
  database: {
    ok: boolean;
    latencyMs: number;
    error: string | null;
  };
  systemd: {
    available: boolean;
    services: Array<{ name: string; active: string; ok: boolean }>;
    error: string | null;
  };
  processes: {
    available: boolean;
    items: Array<{
      label: string;
      pid: number | null;
      rssMb: number | null;
      cmd: string | null;
    }>;
    error: string | null;
  };
  queue: {
    ok: boolean;
    activeCallsToday: number | null;
    waitingQueue: number | null;
    error: string | null;
  };
  alerts: OpsAlert[];
};

@Injectable()
export class OpsService {
  private readonly startedAt = Date.now();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async getStatus(): Promise<OpsStatusPayload> {
    // Timeouts cortos: el monitor no debe agravar picos de latencia.
    const [database, disk, systemd, processes, queue] = await Promise.all([
      this.withTimeout(this.checkDatabase(), 2000, {
        ok: false,
        latencyMs: 2000,
        error: 'timeout 2000ms',
      }),
      this.withTimeout(this.checkDisk(), 2000, {
        available: false,
        mounts: [] as OpsStatusPayload['disk']['mounts'],
        error: 'timeout 2000ms',
      }),
      this.withTimeout(this.checkSystemdServices(), 2500, {
        available: false,
        services: [] as OpsStatusPayload['systemd']['services'],
        error: 'timeout 2500ms',
      }),
      this.withTimeout(this.checkNodeProcesses(), 2000, {
        available: false,
        items: [] as OpsStatusPayload['processes']['items'],
        error: 'timeout 2000ms',
      }),
      this.withTimeout(this.checkQueueSnapshot(), 2000, {
        ok: false,
        activeCallsToday: null,
        waitingQueue: null,
        error: 'timeout 2000ms',
      }),
    ]);

    const payload: OpsStatusPayload = {
      generatedAt: toPanamaOffsetIso(new Date()) ?? new Date().toISOString(),
      host: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        uptimeSeconds: Math.floor(os.uptime()),
      },
      process: this.getProcessSnapshot(),
      memory: this.getMemorySnapshot(),
      cpu: this.getCpuSnapshot(),
      disk,
      database,
      systemd,
      processes,
      queue,
      alerts: [],
    };

    payload.alerts = this.buildAlerts(payload);
    return payload;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
        }),
      ]);
    } catch {
      return fallback;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private getProcessSnapshot() {
    const mem = process.memoryUsage();
    return {
      pid: process.pid,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      startedAtApprox: toPanamaOffsetIso(new Date(this.startedAt)),
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      externalBytes: mem.external,
      rssMb: roundMb(mem.rss),
      heapUsedMb: roundMb(mem.heapUsed),
      heapTotalMb: roundMb(mem.heapTotal),
    };
  }

  private getMemorySnapshot() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usedRatio = total > 0 ? used / total : 0;
    return {
      totalBytes: total,
      freeBytes: free,
      usedBytes: used,
      totalMb: roundMb(total),
      freeMb: roundMb(free),
      usedMb: roundMb(used),
      usedPercent: Math.round(usedRatio * 1000) / 10,
    };
  }

  private getCpuSnapshot() {
    const load = os.loadavg();
    return {
      cores: os.cpus()?.length ?? 0,
      load1: round1(load[0] ?? 0),
      load5: round1(load[1] ?? 0),
      load15: round1(load[2] ?? 0),
    };
  }

  private async checkDatabase() {
    const started = Date.now();
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(`SET LOCAL statement_timeout = '1500ms'`);
        await manager.query('SELECT 1');
      });
      return {
        ok: true,
        latencyMs: Date.now() - started,
        error: null as string | null,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkDisk() {
    if (os.platform() === 'win32') {
      return {
        available: false,
        mounts: [] as OpsStatusPayload['disk']['mounts'],
        error: 'No disponible en Windows (sí en el servidor Linux de prod/QA)',
      };
    }
    try {
      const { stdout } = await execFileAsync('df', ['-kP'], { timeout: 1500 });
      const lines = stdout.trim().split('\n').slice(1);
      const mounts = lines
        .map((line) => line.trim().split(/\s+/))
        .filter((parts) => parts.length >= 6)
        .map((parts) => {
          const totalKb = Number(parts[1]);
          const usedKb = Number(parts[2]);
          const availKb = Number(parts[3]);
          const usedPercent = Number(String(parts[4]).replace('%', ''));
          return {
            filesystem: parts[0],
            mount: parts[5],
            totalMb: Math.round(totalKb / 1024),
            usedMb: Math.round(usedKb / 1024),
            availableMb: Math.round(availKb / 1024),
            usedPercent,
          };
        })
        .filter(
          (m) =>
            m.mount === '/' ||
            m.mount.startsWith('/opt') ||
            m.mount.startsWith('/var') ||
            m.mount.startsWith('/home'),
        );
      return { available: true, mounts, error: null as string | null };
    } catch (err) {
      return {
        available: false,
        mounts: [] as OpsStatusPayload['disk']['mounts'],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkSystemdServices() {
    if (os.platform() === 'win32') {
      return {
        available: false,
        services: [] as OpsStatusPayload['systemd']['services'],
        error: 'systemctl no aplica en Windows',
      };
    }
    const names = [
      process.env.OPS_API_SERVICE || 'hospitalsantafe-api',
      process.env.OPS_WEB_SERVICE || 'hospitalsantafe-web',
      process.env.OPS_DB_SERVICE || 'postgresql',
    ];
    const services: OpsStatusPayload['systemd']['services'] = [];
    for (const name of names) {
      try {
        const { stdout } = await execFileAsync('systemctl', ['is-active', name], {
          timeout: 1500,
        });
        const active = stdout.trim();
        services.push({ name, active, ok: active === 'active' });
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'stdout' in err
            ? String((err as { stdout?: string }).stdout || '').trim()
            : '';
        const active = msg || 'inactive';
        services.push({
          name,
          active,
          ok: active === 'active',
        });
      }
    }
    return { available: true, services, error: null as string | null };
  }

  private async checkNodeProcesses() {
    if (os.platform() === 'win32') {
      const mem = process.memoryUsage();
      return {
        available: true,
        items: [
          {
            label: 'nest-api',
            pid: process.pid,
            rssMb: roundMb(mem.rss),
            cmd: process.argv.join(' ').slice(0, 120),
          },
        ],
        error: 'RSS de Next solo se reporta completo en Linux (prod/QA)',
      };
    }
    try {
      const { stdout } = await execFileAsync('ps', ['-eo', 'pid=,rss=,args='], {
        timeout: 1500,
        maxBuffer: 1024 * 1024,
      });
      const items: OpsStatusPayload['processes']['items'] = [];

      const next = findProcess(stdout, /next-server|next start/i, 'next-web');
      const api = findProcess(stdout, /dist\/main\.js|node .*dist\/main/i, 'nest-api');
      if (next) items.push(next);
      if (api) items.push(api);

      if (!api) {
        const mem = process.memoryUsage();
        items.push({
          label: 'nest-api',
          pid: process.pid,
          rssMb: roundMb(mem.rss),
          cmd: process.argv.join(' ').slice(0, 120),
        });
      }

      return { available: true, items, error: null as string | null };
    } catch (err) {
      return {
        available: false,
        items: [] as OpsStatusPayload['processes']['items'],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkQueueSnapshot() {
    try {
      const active = await this.ticketRepository
        .createQueryBuilder('ticket')
        .where('ticket.status IN (:...statuses)', {
          statuses: [TicketStatus.LLAMADO, TicketStatus.EN_ATENCION],
        })
        .andWhere(
          `to_char(timezone('America/Panama', COALESCE(ticket.calledAt, ticket.createdAt) AT TIME ZONE 'UTC'), 'YYYY-MM-DD')
           = to_char(timezone('America/Panama', now()), 'YYYY-MM-DD')`,
        )
        .getCount();

      const waiting = await this.ticketRepository
        .createQueryBuilder('ticket')
        .where('ticket.status IN (:...statuses)', {
          statuses: [TicketStatus.CREADO, TicketStatus.CHECK_IN, TicketStatus.EN_COLA],
        })
        .andWhere(
          `to_char(timezone('America/Panama', ticket.createdAt AT TIME ZONE 'UTC'), 'YYYY-MM-DD')
           = to_char(timezone('America/Panama', now()), 'YYYY-MM-DD')`,
        )
        .getCount();

      return {
        ok: true,
        activeCallsToday: active,
        waitingQueue: waiting,
        error: null as string | null,
      };
    } catch (err) {
      return {
        ok: false,
        activeCallsToday: null as number | null,
        waitingQueue: null as number | null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private buildAlerts(payload: OpsStatusPayload): OpsAlert[] {
    const alerts: OpsAlert[] = [];

    if (!payload.database.ok) {
      alerts.push({
        level: 'critical',
        code: 'db_down',
        message: `Base de datos no responde: ${payload.database.error || 'error'}`,
      });
    } else if (payload.database.latencyMs > 1000) {
      alerts.push({
        level: 'warn',
        code: 'db_slow',
        message: `Latencia de BD alta: ${payload.database.latencyMs} ms`,
      });
    }

    if (payload.memory.usedPercent >= 90) {
      alerts.push({
        level: 'critical',
        code: 'ram_critical',
        message: `RAM del host al ${payload.memory.usedPercent}% (libre ~${payload.memory.freeMb} MB)`,
      });
    } else if (payload.memory.usedPercent >= 80) {
      alerts.push({
        level: 'warn',
        code: 'ram_high',
        message: `RAM del host al ${payload.memory.usedPercent}% (libre ~${payload.memory.freeMb} MB)`,
      });
    }

    if (payload.process.rssMb >= 1200) {
      alerts.push({
        level: 'warn',
        code: 'api_rss_high',
        message: `Proceso API usando ~${payload.process.rssMb} MB RSS`,
      });
    }

    for (const proc of payload.processes.items) {
      if (proc.label === 'next-web' && proc.rssMb != null && proc.rssMb >= 1500) {
        alerts.push({
          level: 'critical',
          code: 'next_rss_critical',
          message: `Next.js (~${proc.rssMb} MB) está muy alto; reinicie hospitalsantafe-web`,
        });
      } else if (proc.label === 'next-web' && proc.rssMb != null && proc.rssMb >= 1000) {
        alerts.push({
          level: 'warn',
          code: 'next_rss_high',
          message: `Next.js usando ~${proc.rssMb} MB RSS`,
        });
      }
    }

    if (payload.systemd.available) {
      for (const svc of payload.systemd.services) {
        if (!svc.ok) {
          alerts.push({
            level: 'critical',
            code: `service_${svc.name}`,
            message: `Servicio ${svc.name} no está active (estado: ${svc.active})`,
          });
        }
      }
    }

    for (const mount of payload.disk.mounts) {
      if (mount.usedPercent >= 90) {
        alerts.push({
          level: 'critical',
          code: `disk_${mount.mount}`,
          message: `Disco ${mount.mount} al ${mount.usedPercent}%`,
        });
      } else if (mount.usedPercent >= 80) {
        alerts.push({
          level: 'warn',
          code: `disk_${mount.mount}`,
          message: `Disco ${mount.mount} al ${mount.usedPercent}%`,
        });
      }
    }

    if (payload.cpu.cores > 0 && payload.cpu.load1 > payload.cpu.cores * 1.5) {
      alerts.push({
        level: 'warn',
        code: 'load_high',
        message: `Load average 1m = ${payload.cpu.load1} (cores: ${payload.cpu.cores})`,
      });
    }

    return alerts;
  }
}

function roundMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function findProcess(
  psOut: string,
  pattern: RegExp,
  label: string,
): {
  label: string;
  pid: number | null;
  rssMb: number | null;
  cmd: string | null;
} | null {
  const lines = psOut.split('\n');
  let best: { label: string; pid: number; rssMb: number; cmd: string } | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !pattern.test(trimmed)) continue;
    const m = trimmed.match(/^(\d+)\s+(\d+)\s+(.*)$/);
    if (!m) continue;
    const pid = Number(m[1]);
    const rssKb = Number(m[2]);
    const cmd = m[3];
    if (!Number.isFinite(pid) || !Number.isFinite(rssKb)) continue;
    if (/ops\/status|ps -eo/i.test(cmd)) continue;
    const rssMb = Math.round((rssKb / 1024) * 10) / 10;
    if (!best || rssMb > best.rssMb) {
      best = { label, pid, rssMb, cmd: cmd.slice(0, 160) };
    }
  }
  return best;
}
