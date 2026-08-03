import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/** Parches puntuales históricos (idempotentes si el CSV ya los trae). */
const GEO_GAPS_SQL = 'db/migrations/20260525_geo_catalog_gaps.sql';

export function repoRootFromBackend(): string {
  return path.join(process.cwd(), '..');
}

type CsvRow = {
  provincia: string;
  provinciaName: string;
  distrito: string;
  distritoName: string;
  corregCode: string;
  corregimiento: string;
};

function loadUbicacionGeoCsv(root: string): CsvRow[] {
  const csvPath = path.join(root, 'ubicacion_geo.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Archivo no encontrado: ${csvPath}`);
  }

  const lines = fs.readFileSync(csvPath, 'utf-8').split(/\r?\n/);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // PAIS,PAISNAME,PROVINCIA,PROVINCIANAME,DISTRITO,DISTRITONAME,CORREGCODE,CORREGIMIENTO
    const parts = line.split(',');
    if (parts.length < 8) continue;
    const provincia = parts[2]?.trim();
    const provinciaName = parts[3]?.trim();
    const distrito = parts[4]?.trim();
    const distritoName = parts[5]?.trim();
    const corregCode = parts[6]?.trim();
    const corregimiento = parts.slice(7).join(',').trim(); // por si hay comas en el nombre
    if (!provincia || !distrito || !corregCode) continue;
    rows.push({
      provincia,
      provinciaName,
      distrito,
      distritoName,
      corregCode,
      corregimiento,
    });
  }

  if (rows.length === 0) {
    throw new Error('ubicacion_geo.csv no tiene filas de datos');
  }
  return rows;
}

function buildCatalog(rows: CsvRow[]): {
  provincias: Map<string, string>;
  distritos: Map<string, { nombre: string; provinciaCodigo: string }>;
  corregimientos: Map<string, { nombre: string; distritoCodigo: string }>;
} {
  // First-wins: el catálogo de Cellbyte/QA usa códigos legacy (no TE).
  // Algunos corregimientos/distritos repiten código; la primera aparición del CSV es la canónica.
  const provincias = new Map<string, string>();
  const distritos = new Map<string, { nombre: string; provinciaCodigo: string }>();
  const corregimientos = new Map<string, { nombre: string; distritoCodigo: string }>();

  for (const row of rows) {
    if (!provincias.has(row.provincia)) {
      provincias.set(row.provincia, row.provinciaName);
    }
    if (!distritos.has(row.distrito)) {
      distritos.set(row.distrito, {
        nombre: row.distritoName,
        provinciaCodigo: row.provincia,
      });
    }
    if (!corregimientos.has(row.corregCode)) {
      corregimientos.set(row.corregCode, {
        nombre: row.corregimiento,
        distritoCodigo: row.distrito,
      });
    }
  }

  return { provincias, distritos, corregimientos };
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Recarga provincias/distritos/corregimientos desde ubicacion_geo.csv (códigos Cellbyte/QA).
 * Reemplaza el contenido completo de las tablas operativas (TRUNCATE).
 * No usa códigos TE (1301 / 130102); esos rompían el envío a Cellbyte de producción.
 */
export async function syncGeoCatalog(dataSource: DataSource): Promise<void> {
  const root = repoRootFromBackend();
  const rows = loadUbicacionGeoCsv(root);
  const catalog = buildCatalog(rows);

  console.log(
    `→ Catálogo geo desde ubicacion_geo.csv (${rows.length} filas → ${catalog.provincias.size} provincias, ${catalog.distritos.size} distritos, ${catalog.corregimientos.size} corregimientos)`,
  );

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Orden hijo → padre para no chocar con FKs TypeORM
    await queryRunner.query('TRUNCATE TABLE corregimientos, distritos, provincias RESTART IDENTITY CASCADE');

    const provValues = [...catalog.provincias.entries()]
      .map(([codigo, nombre]) => `(${sqlLiteral(codigo)}, ${sqlLiteral(nombre)})`)
      .join(',\n');
    await queryRunner.query(
      `INSERT INTO provincias (codigo, nombre) VALUES\n${provValues}`,
    );

    const distValues = [...catalog.distritos.entries()]
      .map(
        ([codigo, d]) =>
          `(${sqlLiteral(codigo)}, ${sqlLiteral(d.nombre)}, ${sqlLiteral(d.provinciaCodigo)})`,
      )
      .join(',\n');
    await queryRunner.query(
      `INSERT INTO distritos (codigo, nombre, "provinciaCodigo") VALUES\n${distValues}`,
    );

    const corrValues = [...catalog.corregimientos.entries()]
      .map(
        ([codigo, c]) =>
          `(${sqlLiteral(codigo)}, ${sqlLiteral(c.nombre)}, ${sqlLiteral(c.distritoCodigo)})`,
      )
      .join(',\n');
    await queryRunner.query(
      `INSERT INTO corregimientos (codigo, nombre, "distritoCodigo") VALUES\n${corrValues}`,
    );

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }

  // Parches residuales (no-op si ya están en el CSV)
  const gapsPath = path.join(root, GEO_GAPS_SQL);
  if (fs.existsSync(gapsPath)) {
    console.log(`→ Aplicando parches: ${GEO_GAPS_SQL}`);
    await dataSource.query(fs.readFileSync(gapsPath, 'utf-8'));
  }

  const [counts] = await dataSource.query(`
    SELECT
      (SELECT count(*)::int FROM provincias) AS provincias,
      (SELECT count(*)::int FROM distritos) AS distritos,
      (SELECT count(*)::int FROM corregimientos) AS corregimientos
  `);

  // Sanity: Arraiján (prov 13 / dist 1 / corr 4) como en QA Cellbyte
  const sample = await dataSource.query(`
    SELECT d.codigo AS distrito, c.codigo AS corregimiento, c.nombre
    FROM distritos d
    JOIN corregimientos c ON c."distritoCodigo" = d.codigo
    WHERE d."provinciaCodigo" = '13' AND d.codigo = '1' AND c.codigo = '4'
  `);

  console.log(
    `✓ Catálogo geográfico operativo: ${counts.provincias} provincias, ${counts.distritos} distritos, ${counts.corregimientos} corregimientos`,
  );
  if (sample?.[0]) {
    console.log(
      `✓ Muestra Cellbyte/QA: provincia 13 / distrito ${sample[0].distrito} / corregimiento ${sample[0].corregimiento} (${sample[0].nombre})`,
    );
  } else {
    console.warn(
      '⚠ No se encontró 13/1/4 (Arraiján). Verifique ubicacion_geo.csv',
    );
  }
}
