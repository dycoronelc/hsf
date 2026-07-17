import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';

export const SETTING_RECALL_WAIT_SECONDS = 'ticket_recall_wait_seconds';
export const SETTING_NO_SHOW_WAIT_SECONDS = 'ticket_no_show_wait_seconds';
export const SETTING_MONITOR_VOICE_TEMPLATE = 'monitor_voice_template';

export const DEFAULT_MONITOR_VOICE_TEMPLATE =
  'Atención. Paciente con turno {turno}. Por favor acercarse a Ventanilla {ventanilla}.';

export type CallTimingSettings = {
  recallWaitSeconds: number;
  noShowWaitSeconds: number;
};

export type MonitorVoiceSettings = {
  template: string;
};

const DEFAULT_RECALL = 60;
const DEFAULT_NO_SHOW = 60;
const MAX_TEMPLATE_LENGTH = 500;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingsRepository: Repository<AppSetting>,
  ) {}

  private parsePositiveInt(raw: string | undefined, fallback: number): number {
    const n = parseInt(raw ?? '', 10);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
  }

  private envFallbackRecall(): number {
    return this.parsePositiveInt(process.env.TICKET_RECALL_MIN_SECONDS, DEFAULT_RECALL);
  }

  async getCallTimings(): Promise<CallTimingSettings> {
    const rows = await this.settingsRepository.find({
      where: [
        { key: SETTING_RECALL_WAIT_SECONDS },
        { key: SETTING_NO_SHOW_WAIT_SECONDS },
      ],
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const envDefault = this.envFallbackRecall();
    return {
      recallWaitSeconds: this.parsePositiveInt(map.get(SETTING_RECALL_WAIT_SECONDS), envDefault),
      noShowWaitSeconds: this.parsePositiveInt(map.get(SETTING_NO_SHOW_WAIT_SECONDS), envDefault),
    };
  }

  async updateCallTimings(input: {
    recallWaitSeconds?: number;
    noShowWaitSeconds?: number;
  }): Promise<CallTimingSettings> {
    const current = await this.getCallTimings();
    const recall =
      input.recallWaitSeconds !== undefined ? input.recallWaitSeconds : current.recallWaitSeconds;
    const noShow =
      input.noShowWaitSeconds !== undefined ? input.noShowWaitSeconds : current.noShowWaitSeconds;

    if (!Number.isInteger(recall) || recall < 0 || recall > 3600) {
      throw new BadRequestException('El tiempo de «Volver a llamar» debe ser entre 0 y 3600 segundos');
    }
    if (!Number.isInteger(noShow) || noShow < 0 || noShow > 3600) {
      throw new BadRequestException('El tiempo de «No se presentó» debe ser entre 0 y 3600 segundos');
    }

    await this.upsert(SETTING_RECALL_WAIT_SECONDS, String(recall));
    await this.upsert(SETTING_NO_SHOW_WAIT_SECONDS, String(noShow));
    return { recallWaitSeconds: recall, noShowWaitSeconds: noShow };
  }

  async getMonitorVoiceTemplate(): Promise<MonitorVoiceSettings> {
    const row = await this.settingsRepository.findOne({
      where: { key: SETTING_MONITOR_VOICE_TEMPLATE },
    });
    const template = row?.value?.trim() || DEFAULT_MONITOR_VOICE_TEMPLATE;
    return { template };
  }

  async updateMonitorVoiceTemplate(input: { template?: string }): Promise<MonitorVoiceSettings> {
    const raw = input.template?.trim() ?? '';
    if (!raw) {
      throw new BadRequestException('La plantilla del anuncio no puede estar vacía');
    }
    if (raw.length > MAX_TEMPLATE_LENGTH) {
      throw new BadRequestException(
        `La plantilla no puede superar ${MAX_TEMPLATE_LENGTH} caracteres`,
      );
    }
    await this.upsert(SETTING_MONITOR_VOICE_TEMPLATE, raw);
    return { template: raw };
  }

  private async upsert(key: string, value: string) {
    const existing = await this.settingsRepository.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      await this.settingsRepository.save(existing);
      return;
    }
    await this.settingsRepository.save(this.settingsRepository.create({ key, value }));
  }
}
