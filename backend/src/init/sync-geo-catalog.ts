import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export function repoRootFromBackend(): string {
  return path.join(process.cwd(), '..');
}

type GeoRow = {
  provincia: string;
  provinciaName: string;
  distrito: string;
  distritoName: string;
  corregCode: string;
  corregimiento: string;
};

/**
 * Fuente oficial Cellbyte: ubicacion_geo.csv regenerado desde docs/ubicacion_geo.xlsx
 * (mismas columnas PAIS…CORREGIMIENTO).
 */
function loadUbicacionGeoCsv(root: string): GeoRow[] {
  const candidates = [
    path.join(root, 'ubicacion_geo.csv'),
    path.join(root, 'docs', 'ubicacion_geo.csv'),
  ];
  const csvPath = candidates.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error(
      'No se encontró ubicacion_geo.csv (raíz del repo). Genérelo desde docs/ubicacion_geo.xlsx con scripts/export-ubicacion-geo-from-xlsx.py',
    );
  }

  const lines = fs.readFileSync(csvPath, 'utf-8').split(/\r?\n/);
  const rows: GeoRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 8) continue;
    const provincia = parts[2]?.trim();
    const provinciaName = parts[3]?.trim();
    const distrito = parts[4]?.trim();
    const distritoName = parts[5]?.trim();
    const corregCode = parts[6]?.trim();
    const corregimiento = parts.slice(7).join(',').trim();
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
    throw new Error(`ubicacion_geo.csv vacío: ${csvPath}`);
  }
  console.log(`→ Fuente geo: ${csvPath}`);
  return rows;
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

type Catalog = {
  provincias: Map<string, string>;
  /** key: provincia|distrito */
  distritos: Map<string, { codigo: string; nombre: string; provinciaCodigo: string }>;
  /** key: provincia|distrito|correg */
  corregimientos: Map<
    string,
    { codigo: string; nombre: string; distritoCodigo: string; provinciaCodigo: string }
  >;
};

function buildCatalog(rows: GeoRow[]): Catalog {
  const provincias = new Map<string, string>();
  const distritos = new Map<string, { codigo: string; nombre: string; provinciaCodigo: string }>();
  const corregimientos = new Map<
    string,
    { codigo: string; nombre: string; distritoCodigo: string; provinciaCodigo: string }
  >();

  for (const row of rows) {
    if (!provincias.has(row.provincia)) {
      provincias.set(row.provincia, row.provinciaName);
    }
    const dKey = `${row.provincia}|${row.distrito}`;
    if (!distritos.has(dKey)) {
      distritos.set(dKey, {
        codigo: row.distrito,
        nombre: row.distritoName,
        provinciaCodigo: row.provincia,
      });
    }
    const cKey = `${row.provincia}|${row.distrito}|${row.corregCode}`;
    if (!corregimientos.has(cKey)) {
      corregimientos.set(cKey, {
        codigo: row.corregCode,
        nombre: row.corregimiento,
        distritoCodigo: row.distrito,
        provinciaCodigo: row.provincia,
      });
    }
  }

  return { provincias, distritos, corregimientos };
}

/**
 * Recrea provincias / distritos / corregimientos desde el catálogo Cellbyte
 * (códigos jerárquicos del xlsx/csv, no códigos TE 1301/130102).
 */
export async function syncGeoCatalog(dataSource: DataSource): Promise<void> {
  const root = repoRootFromBackend();
  const rows = loadUbicacionGeoCsv(root);
  const catalog = buildCatalog(rows);

  console.log(
    `→ Catálogo Cellbyte: ${rows.length} filas → ${catalog.provincias.size} provincias, ${catalog.distritos.size} distritos, ${catalog.corregimientos.size} corregimientos`,
  );

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Esquema jerárquico Cellbyte (PK compuestas)
    await queryRunner.query(`DROP TABLE IF EXISTS corregimientos CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS distritos CASCADE`);
    // provincias puede quedar
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS provincias (
        codigo character varying NOT NULL,
        nombre character varying NOT NULL,
        CONSTRAINT "PK_provincias" PRIMARY KEY (codigo)
      )
    `);
    await queryRunner.query(`TRUNCATE TABLE provincias RESTART IDENTITY CASCADE`);

    await queryRunner.query(`
      CREATE TABLE distritos (
        codigo character varying NOT NULL,
        nombre character varying NOT NULL,
        "provinciaCodigo" character varying NOT NULL,
        CONSTRAINT "PK_distritos" PRIMARY KEY (codigo, "provinciaCodigo"),
        CONSTRAINT "FK_distritos_provincia"
          FOREIGN KEY ("provinciaCodigo") REFERENCES provincias(codigo)
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE corregimientos (
        codigo character varying NOT NULL,
        nombre character varying NOT NULL,
        "distritoCodigo" character varying NOT NULL,
        "provinciaCodigo" character varying NOT NULL,
        CONSTRAINT "PK_corregimientos" PRIMARY KEY (codigo, "distritoCodigo", "provinciaCodigo"),
        CONSTRAINT "FK_corregimientos_distrito"
          FOREIGN KEY ("distritoCodigo", "provinciaCodigo")
          REFERENCES distritos (codigo, "provinciaCodigo")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    const provValues = [...catalog.provincias.entries()]
      .map(([codigo, nombre]) => `(${sqlLiteral(codigo)}, ${sqlLiteral(nombre)})`)
      .join(',\n');
    await queryRunner.query(
      `INSERT INTO provincias (codigo, nombre) VALUES\n${provValues}`,
    );

    const distValues = [...catalog.distritos.values()]
      .map(
        (d) =>
          `(${sqlLiteral(d.codigo)}, ${sqlLiteral(d.nombre)}, ${sqlLiteral(d.provinciaCodigo)})`,
      )
      .join(',\n');
    await queryRunner.query(
      `INSERT INTO distritos (codigo, nombre, "provinciaCodigo") VALUES\n${distValues}`,
    );

    const corrValues = [...catalog.corregimientos.values()]
      .map(
        (c) =>
          `(${sqlLiteral(c.codigo)}, ${sqlLiteral(c.nombre)}, ${sqlLiteral(c.distritoCodigo)}, ${sqlLiteral(c.provinciaCodigo)})`,
      )
      .join(',\n');
    await queryRunner.query(
      `INSERT INTO corregimientos (codigo, nombre, "distritoCodigo", "provinciaCodigo") VALUES\n${corrValues}`,
    );

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }

  const [counts] = await dataSource.query(`
    SELECT
      (SELECT count(*)::int FROM provincias) AS provincias,
      (SELECT count(*)::int FROM distritos) AS distritos,
      (SELECT count(*)::int FROM corregimientos) AS corregimientos
  `);

  const sample = await dataSource.query(`
    SELECT d.codigo AS distrito, c.codigo AS corregimiento, c.nombre
    FROM distritos d
    JOIN corregimientos c
      ON c."distritoCodigo" = d.codigo
     AND c."provinciaCodigo" = d."provinciaCodigo"
    WHERE d."provinciaCodigo" = '13' AND d.codigo = '1' AND c.codigo = '4'
  `);

  console.log(
    `✓ Catálogo geográfico Cellbyte: ${counts.provincias} provincias, ${counts.distritos} distritos, ${counts.corregimientos} corregimientos`,
  );
  if (sample?.[0]) {
    console.log(
      `✓ Muestra: provincia 13 / distrito ${sample[0].distrito} / corregimiento ${sample[0].corregimiento} (${sample[0].nombre})`,
    );
  } else {
    console.warn('⚠ No se encontró 13/1/4 (Arraiján / Juan Demóstenes). Verifique la fuente.');
  }
}
