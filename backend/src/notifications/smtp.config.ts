/** Envío real SMTP: producción o desarrollo con SMTP_SEND_IN_DEV=true */
export function isSmtpDeliveryEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'production' || process.env.SMTP_SEND_IN_DEV === 'true'
  );
}

export function getSmtpHost(): string {
  return (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
}

export function getSmtpPort(): number {
  const raw = (process.env.SMTP_PORT || '587').trim();
  const port = parseInt(raw, 10);
  return Number.isFinite(port) ? port : 587;
}

export function getSmtpUser(): string {
  return (process.env.SMTP_USER || '').trim();
}

export function getSmtpPass(): string {
  return (process.env.SMTP_PASS || '').trim();
}

export function getSmtpFrom(): string {
  const raw = (process.env.SMTP_FROM || 'Hospital Santa Fe <noreply@hospitalsantafe.com>').trim();
  return raw.replace(/^["']|["']$/g, '');
}

export function isSmtpConfigured(): boolean {
  return getSmtpUser().length > 0 && getSmtpPass().length > 0;
}

export function getSmtpConfigSummary(): {
  deliveryEnabled: boolean;
  configured: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
} {
  return {
    deliveryEnabled: isSmtpDeliveryEnabled(),
    configured: isSmtpConfigured(),
    host: getSmtpHost(),
    port: getSmtpPort(),
    user: getSmtpUser(),
    from: getSmtpFrom(),
  };
}

export function assertSmtpReadyForSend(): void {
  if (!isSmtpDeliveryEnabled()) return;
  if (!isSmtpConfigured()) {
    throw new Error(
      'SMTP no configurado: defina SMTP_USER y SMTP_PASS en el .env del servidor (y reinicie hospitalsantafe-api).',
    );
  }
}

export function formatSmtpError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Error desconocido al enviar correo';
  const e = err as { message?: string; code?: string; response?: string; responseCode?: number };
  const parts = [e.message, e.code, e.responseCode ? String(e.responseCode) : '', e.response]
    .filter(Boolean)
    .map((p) => String(p).trim());
  return parts.join(' — ') || 'Error desconocido al enviar correo';
}
