import * as fs from 'fs';
import * as path from 'path';

let cachedLogoDataUri: string | null | undefined;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getPublicLogoUrl(filename: string): string | null {
  const base = (process.env.FRONTEND_URL || process.env.APP_BASE_URL || '').trim().replace(/\/$/, '');
  if (!base || base.includes('localhost') || base.includes('127.0.0.1') || base.includes('192.168.')) {
    return null;
  }
  return `${base}/${filename}`;
}

function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), '..', 'public', 'logo-blanco.png'),
    path.join(process.cwd(), 'public', 'logo-blanco.png'),
    path.join(__dirname, '..', '..', '..', 'public', 'logo-blanco.png'),
    path.join(process.cwd(), '..', 'public', 'logo-hospital-santa-fe.png'),
    path.join(process.cwd(), 'public', 'logo-hospital-santa-fe.png'),
    path.join(__dirname, '..', '..', '..', 'public', 'logo-hospital-santa-fe.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Evita adjuntar PNG enormes en base64 (p. ej. >80 KB) que algunos SMTP rechazan. */
const MAX_LOGO_EMBED_BYTES = 80_000;

/** Logo para correos: URL pública si existe; si no, base64 embebido (solo si es liviano). */
export function getEmailLogoSrc(): string {
  const publicUrl = getPublicLogoUrl('logo-blanco.png');
  if (publicUrl) return publicUrl;

  if (cachedLogoDataUri !== undefined) {
    return cachedLogoDataUri ?? '';
  }

  const logoPath = resolveLogoPath();
  if (!logoPath) {
    cachedLogoDataUri = null;
    return '';
  }

  try {
    const buffer = fs.readFileSync(logoPath);
    if (buffer.length > MAX_LOGO_EMBED_BYTES) {
      cachedLogoDataUri = null;
      return '';
    }
    const ext = path.extname(logoPath).toLowerCase() === '.png' ? 'png' : 'jpeg';
    cachedLogoDataUri = `data:image/${ext};base64,${buffer.toString('base64')}`;
    return cachedLogoDataUri;
  } catch {
    cachedLogoDataUri = null;
    return '';
  }
}

export type EmailTemplateOptions = {
  title?: string;
  preheader?: string;
  bodyHtml: string;
};

export function buildEmailHtml(options: EmailTemplateOptions): string {
  const { title, preheader, bodyHtml } = options;
  const logoSrc = getEmailLogoSrc();
  const logoImg = logoSrc
    ? `<img src="${logoSrc}" alt="Hospital Santa Fe Panamá" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;border:0;" />`
    : `<p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">Hospital Santa Fe Panamá</p>`;

  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}</div>`
    : '';

  const titleBlock = title
    ? `<h1 style="margin:0 0 18px;font-size:22px;line-height:1.35;color:#00816D;font-weight:700;">${escapeHtml(title)}</h1>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title || 'Hospital Santa Fe')}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef4f2;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  ${preheaderBlock}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef4f2;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbe7e3;box-shadow:0 8px 24px rgba(0,129,109,0.08);">
          <tr>
            <td style="background-color:#00816D;padding:28px 24px;text-align:center;">
              ${logoImg}
            </td>
          </tr>
          <tr>
            <td style="height:4px;background-color:#00AA83;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 28px 24px;color:#1f2937;font-size:16px;line-height:1.6;">
              ${titleBlock}
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8faf9;padding:20px 28px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:13px;color:#00816D;font-weight:600;">Hospital Santa Fe Panamá</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Plataforma de preadmisión y gestión de turnos<br />
                Este es un correo automático; no responda a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#1f2937;">${html}</p>`;
}

export function emailMutedNote(text: string): string {
  return `<p style="margin:16px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">${escapeHtml(text)}</p>`;
}

export function emailSmallPrint(text: string): string {
  return `<p style="margin:12px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;word-break:break-all;">${escapeHtml(text)}</p>`;
}

export function emailButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
    <tr>
      <td align="center" style="border-radius:10px;background-color:#00816D;">
        <a href="${safeHref}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${safeLabel}</a>
      </td>
    </tr>
  </table>`;
}

export function emailCodeDisplay(code: string): string {
  return `<div style="text-align:center;margin:24px 0;padding:22px 16px;background:linear-gradient(180deg,#f0f9f7 0%,#ffffff 100%);border:2px dashed #00AA83;border-radius:12px;">
    <p style="margin:0 0 10px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;">Su código de verificación</p>
    <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:8px;color:#00816D;font-family:Consolas,Monaco,'Courier New',monospace;">${escapeHtml(code)}</p>
  </div>`;
}

export function emailDataTable(rows: Array<{ label: string; value: string }>): string {
  const rowsHtml = rows
    .map((row, index) => {
      const border = index < rows.length - 1 ? 'border-bottom:1px solid #e5e7eb;' : '';
      return `<tr>
        <td style="padding:12px 14px;${border}font-weight:600;color:#374151;width:42%;vertical-align:top;background-color:#f9fafb;">${escapeHtml(row.label)}</td>
        <td style="padding:12px 14px;${border}color:#1f2937;vertical-align:top;">${row.value}</td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">${rowsHtml}</table>`;
}

export function emailHighlightBox(innerHtml: string): string {
  return `<div style="margin:24px 0;padding:20px;background-color:#f0f9f7;border-left:4px solid #00816D;border-radius:0 12px 12px 0;">${innerHtml}</div>`;
}

export function emailBadge(text: string): string {
  return `<span style="display:inline-block;padding:4px 10px;background-color:#e6f4f1;color:#00816D;font-size:12px;font-weight:700;border-radius:999px;letter-spacing:0.3px;">${escapeHtml(text)}</span>`;
}
