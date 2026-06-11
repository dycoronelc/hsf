export type CellbyteConfig = {
  baseUrl: string;
  username: string;
  password: string;
  authUrl: string;
  preAdmissionUrl: string;
};

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveBaseUrl(): string | null {
  const base = process.env.CELLBYTE_BASE_URL?.trim();
  if (base) return trimTrailingSlash(base);

  const legacy = process.env.CELLBYTE_URL?.trim();
  if (!legacy) return null;

  try {
    const parsed = new URL(legacy);
    const path = parsed.pathname.replace(/\/api\/v1\/pre-admission\/?$/i, '');
    parsed.pathname = path || '/';
    parsed.search = '';
    parsed.hash = '';
    return trimTrailingSlash(parsed.toString().replace(/\/$/, ''));
  } catch {
    return trimTrailingSlash(legacy.replace(/\/api\/v1\/pre-admission\/?$/i, ''));
  }
}

export function getCellbyteConfig(): CellbyteConfig | null {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return null;

  const username = process.env.CELLBYTE_USERNAME?.trim() ?? '';
  const password = process.env.CELLBYTE_PASSWORD?.trim() ?? '';

  return {
    baseUrl,
    username,
    password,
    authUrl: `${baseUrl}/api/v1/auth`,
    preAdmissionUrl: `${baseUrl}/api/v1/pre-admission`,
  };
}

export function isCellbyteConfigured(): boolean {
  return getCellbyteConfig() !== null;
}
