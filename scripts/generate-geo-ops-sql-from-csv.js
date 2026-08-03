/**
 * Genera SQL de reemplazo de provincias/distritos/corregimientos
 * a partir de ubicacion_geo.csv (códigos QA/Cellbyte).
 *
 * Uso:
 *   node scripts/generate-geo-ops-sql-from-csv.js
 *   → escribe db/migrations/20260803_replace_geo_ops_from_ubicacion_csv.sql
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'ubicacion_geo.csv');
const outPath = path.join(
  root,
  'db',
  'migrations',
  '20260803_replace_geo_ops_from_ubicacion_csv.sql',
);

function lit(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/);
const provincias = new Map();
const distritos = new Map();
const corregimientos = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const parts = line.split(',');
  if (parts.length < 8) continue;
  const provincia = parts[2].trim();
  const provinciaName = parts[3].trim();
  const distrito = parts[4].trim();
  const distritoName = parts[5].trim();
  const corregCode = parts[6].trim();
  const corregimiento = parts.slice(7).join(',').trim();
  if (!provincia || !distrito || !corregCode) continue;

  if (!provincias.has(provincia)) provincias.set(provincia, provinciaName);
  if (!distritos.has(distrito)) {
    distritos.set(distrito, { nombre: distritoName, provinciaCodigo: provincia });
  }
  if (!corregimientos.has(corregCode)) {
    corregimientos.set(corregCode, {
      nombre: corregimiento,
      distritoCodigo: distrito,
    });
  }
}

const parts = [];
parts.push(`-- Reemplazo catálogo operativo provincias/distritos/corregimientos`);
parts.push(`-- Fuente: ubicacion_geo.csv (mismo formato que QA / Cellbyte)`);
parts.push(`-- Generado: ${new Date().toISOString()}`);
parts.push(`-- Códigos TE (1301, 130102, …) NO se usan aquí.`);
parts.push(``);
parts.push(`BEGIN;`);
parts.push(``);
parts.push(`-- Respaldo opcional (descomente si lo necesita):`);
parts.push(`-- CREATE TABLE IF NOT EXISTS backup_provincias_20260803 AS SELECT * FROM provincias;`);
parts.push(`-- CREATE TABLE IF NOT EXISTS backup_distritos_20260803 AS SELECT * FROM distritos;`);
parts.push(`-- CREATE TABLE IF NOT EXISTS backup_corregimientos_20260803 AS SELECT * FROM corregimientos;`);
parts.push(``);
parts.push(`TRUNCATE TABLE corregimientos, distritos, provincias RESTART IDENTITY CASCADE;`);
parts.push(``);

parts.push(`INSERT INTO provincias (codigo, nombre) VALUES`);
parts.push(
  [...provincias.entries()]
    .map(([c, n]) => `  (${lit(c)}, ${lit(n)})`)
    .join(',\n') + ';',
);
parts.push(``);

parts.push(`INSERT INTO distritos (codigo, nombre, "provinciaCodigo") VALUES`);
parts.push(
  [...distritos.entries()]
    .map(([c, d]) => `  (${lit(c)}, ${lit(d.nombre)}, ${lit(d.provinciaCodigo)})`)
    .join(',\n') + ';',
);
parts.push(``);

parts.push(`INSERT INTO corregimientos (codigo, nombre, "distritoCodigo") VALUES`);
parts.push(
  [...corregimientos.entries()]
    .map(([c, r]) => `  (${lit(c)}, ${lit(r.nombre)}, ${lit(r.distritoCodigo)})`)
    .join(',\n') + ';',
);
parts.push(``);
parts.push(`COMMIT;`);
parts.push(``);
parts.push(`-- Verificación esperada: provincia 13 / distrito 1 / corregimiento 4 (Juan Demostenes…)`);
parts.push(`SELECT p.codigo AS provincia, d.codigo AS distrito, c.codigo AS corregimiento, c.nombre`);
parts.push(`FROM provincias p`);
parts.push(`JOIN distritos d ON d."provinciaCodigo" = p.codigo`);
parts.push(`JOIN corregimientos c ON c."distritoCodigo" = d.codigo`);
parts.push(`WHERE p.codigo = '13' AND d.codigo = '1' AND c.codigo = '4';`);

fs.writeFileSync(outPath, parts.join('\n'), 'utf8');
console.log('Wrote', outPath);
console.log(
  provincias.size,
  'provincias,',
  distritos.size,
  'distritos,',
  corregimientos.size,
  'corregimientos',
);
