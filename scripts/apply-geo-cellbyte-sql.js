/**
 * Aplica db/migrations/20260803_replace_geo_from_cellbyte_xlsx.sql sin arrancar Nest/TypeORM.
 * Evita el fallo de synchronize al cambiar PK simples → compuestas.
 *
 * Uso (en el servidor, como usuario de la app):
 *   node scripts/apply-geo-cellbyte-sql.js
 *   npm run backend:apply-geo-sql
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const root = path.join(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function resolveSsl() {
  // Solo SSL si se pide explícitamente (on-prem Postgres local no suele usarlo).
  if (process.env.DATABASE_SSL === 'true') {
    return { rejectUnauthorized: false };
  }
  return false;
}

async function main() {
  loadEnvFile(path.join(root, '.env'));
  loadEnvFile(path.join(root, 'backend', '.env'));

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL no está definido. Configure /opt/hospitalsantafe/.env',
    );
  }

  const sqlPath = path.join(
    root,
    'db',
    'migrations',
    '20260803_replace_geo_from_cellbyte_xlsx.sql',
  );
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`No se encontró ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: resolveSsl(),
  });

  console.log('→ Aplicando catálogo geo Cellbyte (SQL, sin Nest)...');
  await client.connect();
  try {
    await client.query(sql);
    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM provincias) AS provincias,
        (SELECT count(*)::int FROM distritos) AS distritos,
        (SELECT count(*)::int FROM corregimientos) AS corregimientos
    `);
    const sample = await client.query(`
      SELECT c.nombre
      FROM corregimientos c
      WHERE c."provinciaCodigo" = '13' AND c."distritoCodigo" = '1' AND c.codigo = '4'
    `);
    console.log(
      `✓ Geo Cellbyte: ${counts.rows[0].provincias} provincias, ${counts.rows[0].distritos} distritos, ${counts.rows[0].corregimientos} corregimientos`,
    );
    if (sample.rows[0]) {
      console.log(`✓ Muestra 13/1/4: ${sample.rows[0].nombre}`);
    } else {
      console.warn('⚠ No se encontró 13/1/4 tras aplicar el SQL');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('✗ apply-geo-cellbyte-sql:', err.message || err);
  process.exit(1);
});
