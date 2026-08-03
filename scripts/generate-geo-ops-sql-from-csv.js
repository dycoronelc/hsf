/**
 * Regenera el SQL de carga desde ubicacion_geo.csv (exportado del xlsx Cellbyte).
 * node scripts/generate-geo-ops-sql-from-csv.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'ubicacion_geo.csv');
const outPath = path.join(
  root,
  'db',
  'migrations',
  '20260803_replace_geo_from_cellbyte_xlsx.sql',
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

  const dKey = `${provincia}|${distrito}`;
  if (!distritos.has(dKey)) {
    distritos.set(dKey, {
      codigo: distrito,
      nombre: distritoName,
      provinciaCodigo: provincia,
    });
  }

  const cKey = `${provincia}|${distrito}|${corregCode}`;
  if (!corregimientos.has(cKey)) {
    corregimientos.set(cKey, {
      codigo: corregCode,
      nombre: corregimiento,
      distritoCodigo: distrito,
      provinciaCodigo: provincia,
    });
  }
}

const out = [];
out.push(`-- Catálogo geo Cellbyte (docs/ubicacion_geo.xlsx → ubicacion_geo.csv)`);
out.push(`-- Generado: ${new Date().toISOString()}`);
out.push(`-- PKs compuestas: distritos(codigo, provincia) / corregimientos(codigo, distrito, provincia)`);
out.push(``);
out.push(`BEGIN;`);
out.push(``);
out.push(`DROP TABLE IF EXISTS corregimientos CASCADE;`);
out.push(`DROP TABLE IF EXISTS distritos CASCADE;`);
out.push(`TRUNCATE TABLE provincias RESTART IDENTITY CASCADE;`);
out.push(``);
out.push(`CREATE TABLE distritos (`);
out.push(`  codigo character varying NOT NULL,`);
out.push(`  nombre character varying NOT NULL,`);
out.push(`  "provinciaCodigo" character varying NOT NULL,`);
out.push(`  CONSTRAINT "PK_distritos" PRIMARY KEY (codigo, "provinciaCodigo"),`);
out.push(`  CONSTRAINT "FK_distritos_provincia"`);
out.push(`    FOREIGN KEY ("provinciaCodigo") REFERENCES provincias(codigo)`);
out.push(`    ON DELETE CASCADE ON UPDATE CASCADE`);
out.push(`);`);
out.push(``);
out.push(`CREATE TABLE corregimientos (`);
out.push(`  codigo character varying NOT NULL,`);
out.push(`  nombre character varying NOT NULL,`);
out.push(`  "distritoCodigo" character varying NOT NULL,`);
out.push(`  "provinciaCodigo" character varying NOT NULL,`);
out.push(`  CONSTRAINT "PK_corregimientos" PRIMARY KEY (codigo, "distritoCodigo", "provinciaCodigo"),`);
out.push(`  CONSTRAINT "FK_corregimientos_distrito"`);
out.push(`    FOREIGN KEY ("distritoCodigo", "provinciaCodigo")`);
out.push(`    REFERENCES distritos (codigo, "provinciaCodigo")`);
out.push(`    ON DELETE CASCADE ON UPDATE CASCADE`);
out.push(`);`);
out.push(``);

out.push(`INSERT INTO provincias (codigo, nombre) VALUES`);
out.push(
  [...provincias.entries()]
    .map(([c, n]) => `  (${lit(c)}, ${lit(n)})`)
    .join(',\n') + ';',
);
out.push(``);

out.push(`INSERT INTO distritos (codigo, nombre, "provinciaCodigo") VALUES`);
out.push(
  [...distritos.values()]
    .map((d) => `  (${lit(d.codigo)}, ${lit(d.nombre)}, ${lit(d.provinciaCodigo)})`)
    .join(',\n') + ';',
);
out.push(``);

out.push(`INSERT INTO corregimientos (codigo, nombre, "distritoCodigo", "provinciaCodigo") VALUES`);
out.push(
  [...corregimientos.values()]
    .map(
      (c) =>
        `  (${lit(c.codigo)}, ${lit(c.nombre)}, ${lit(c.distritoCodigo)}, ${lit(c.provinciaCodigo)})`,
    )
    .join(',\n') + ';',
);
out.push(``);
out.push(`COMMIT;`);
out.push(``);
out.push(`-- Debe devolver: 1 | 4 | JUAN DEMOSTENES AROSEMENA`);
out.push(`SELECT d.codigo AS distrito, c.codigo AS corregimiento, c.nombre`);
out.push(`FROM distritos d`);
out.push(`JOIN corregimientos c ON c."distritoCodigo" = d.codigo AND c."provinciaCodigo" = d."provinciaCodigo"`);
out.push(`WHERE d."provinciaCodigo" = '13' AND d.codigo = '1' AND c.codigo = '4';`);

fs.writeFileSync(outPath, out.join('\n'), 'utf8');
console.log('Wrote', outPath);
console.log(
  provincias.size,
  'provincias,',
  distritos.size,
  'distritos,',
  corregimientos.size,
  'corregimientos',
);
