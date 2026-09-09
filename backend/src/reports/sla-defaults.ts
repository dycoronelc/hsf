/**
 * Valores por defecto de SLA (minutos) alineados al cuadro operativo del hospital.
 * Clave = código de servicio.
 */
export const DEFAULT_SLA_BY_SERVICE_CODE: Record<
  string,
  { wait: number; attention: number }
> = {
  OT: { wait: 10, attention: 20 }, // OTS / Otros servicios
  URG: { wait: 5, attention: 15 }, // Urgencia
  TRIAGE: { wait: 5, attention: 10 },
  PMSF: { wait: 15, attention: 30 }, // Plan Médico Santa Fe
  ADM: { wait: 10, attention: 15 },
  CTA: { wait: 10, attention: 20 },
  HOSP: { wait: 10, attention: 20 },
  CEH: { wait: 10, attention: 25 },
  LAB: { wait: 10, attention: 30 },
  RAD: { wait: 10, attention: 45 },
  TOM: { wait: 15, attention: 60 },
  RMN: { wait: 15, attention: 90 },
  ECO: { wait: 10, attention: 30 },
};

/** Servicios sin fila en el mapa: espera ≈ mitad del estimado, atención = estimado. */
export function defaultSlaForService(service: {
  code?: string | null;
  estimatedTime?: number | null;
  slaWaitMinutes?: number | null;
  slaAttentionMinutes?: number | null;
}): { wait: number; attention: number } {
  const code = String(service.code || '').toUpperCase();
  const preset = DEFAULT_SLA_BY_SERVICE_CODE[code];
  const estimated = service.estimatedTime && service.estimatedTime > 0 ? service.estimatedTime : 15;
  const waitDefault = preset?.wait ?? Math.max(5, Math.round(estimated / 2));
  const attentionDefault = preset?.attention ?? estimated;
  return {
    wait:
      service.slaWaitMinutes != null && service.slaWaitMinutes > 0
        ? service.slaWaitMinutes
        : waitDefault,
    attention:
      service.slaAttentionMinutes != null && service.slaAttentionMinutes > 0
        ? service.slaAttentionMinutes
        : attentionDefault,
  };
}
