/**
 * Convierte db/datosgeograficos.sql (MySQL) a tablas de referencia PostgreSQL
 * y genera db/validacion_geo_catalogo.sql
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const sourcePath = path.join(root, 'db', 'datosgeograficos.sql')
const refSqlPath = path.join(root, 'db', 'datosgeograficos_postgres.sql')
const validationPath = path.join(root, 'db', 'validacion_geo_catalogo.sql')

const raw = fs.readFileSync(sourcePath, 'utf8')

function escapePg(value) {
  return String(value).replace(/'/g, "''")
}

function parseProvincias() {
  const block = raw.match(/INSERT INTO `cat_provincias`[^;]+;/s)?.[0] ?? ''
  return [...block.matchAll(/\((\d+),\s*(\d+),\s*'([^']*)'\)/g)].map((m) => ({
    id: Number(m[1]),
    codProv: String(m[2]).padStart(2, '0'),
    nombre: m[3],
  }))
}

function parseDistritos() {
  const block = raw.match(/INSERT INTO `distritos`[^;]+;/s)?.[0] ?? ''
  return [...block.matchAll(
    /\((\d+),\s*(\d+),\s*'([^']*)',\s*(\d+),\s*'([^']*)',\s*(\d+),\s*(\d+)\)/g,
  )].map((m) => ({
    id: Number(m[1]),
    codProv: String(m[2]).padStart(2, '0'),
    provincia: m[3],
    codDistrito: String(m[4]).padStart(2, '0'),
    nombre: m[5],
    codProvDist: String(m[6]).padStart(4, '0'),
    idProvincia: Number(m[7]),
  }))
}

function normGeo(txt) {
  return String(txt ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\(cabecera\)\s*/gi, ' ')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function rowCorregimientoQuality(row) {
  const nombre = normGeo(row.nombre)
  const distrito = normGeo(row.distrito)
  let score = 0
  if (nombre === distrito || nombre.includes(distrito) || distrito.includes(nombre)) score += 10
  if (nombre.includes('GUALACA') && !distrito.includes('GUALACA')) score -= 20
  if (nombre.includes('HORNITO') && distrito.includes('DOLEGA')) score -= 10
  if (nombre.includes('PAJA DE SOMBRERO') && distrito.includes('DOLEGA')) score -= 10
  if (nombre.includes('LOS ANGELES') && distrito.includes('DOLEGA')) score -= 10
  if (nombre.includes('RINCON') && distrito.includes('DOLEGA')) score -= 10
  return score
}

function isMisfiledDuplicate(row) {
  return rowCorregimientoQuality(row) < 0
}

function buildCorregimientoKey(row) {
  return `${row.codProv}${row.codDistrito}${row.codCorr}`
}

function nextAvailableCodCorr(usedCorrByDist, codProvDist) {
  const used = usedCorrByDist.get(codProvDist) ?? new Set()
  for (let i = 1; i <= 99; i++) {
    const codCorr = String(i).padStart(2, '0')
    if (!used.has(codCorr)) return codCorr
  }
  return null
}

function dedupeCorregimientos(rows) {
  const sorted = [...rows].sort((a, b) => a.id - b.id)
  const byKey = new Map()
  const usedCorrByDist = new Map()
  const omitted = []
  const reassigned = []

  for (const row of sorted) {
    let codCorr = row.codCorr
    let codProvDistCorr = row.codProvDistCorr
    let key = buildCorregimientoKey({ ...row, codCorr })

    if (byKey.has(key)) {
      const existing = byKey.get(key)

      if (isMisfiledDuplicate(row)) {
        omitted.push({ id: row.id, key, nombre: row.nombre, reason: 'misfiled_duplicate' })
        continue
      }

      if (isMisfiledDuplicate(existing)) {
        omitted.push({
          id: existing.id,
          key,
          nombre: existing.nombre,
          reason: 'replaced_misfiled_duplicate',
        })
        byKey.delete(key)
        usedCorrByDist.get(existing.codProvDist)?.delete(existing.codCorr)
      } else {
        const keepExisting = rowCorregimientoQuality(existing) >= rowCorregimientoQuality(row)
        if (keepExisting) {
          if (normGeo(existing.nombre) !== normGeo(row.nombre)) {
            const nextCorr = nextAvailableCodCorr(usedCorrByDist, row.codProvDist)
            if (nextCorr) {
              codCorr = nextCorr
              codProvDistCorr = `${row.codProvDist}${nextCorr}`
              key = buildCorregimientoKey({ ...row, codCorr })
              reassigned.push({
                id: row.id,
                nombre: row.nombre,
                from: row.codProvDistCorr,
                to: codProvDistCorr,
              })
            } else {
              omitted.push({ id: row.id, key, nombre: row.nombre, reason: 'duplicate_key' })
              continue
            }
          } else {
            omitted.push({ id: row.id, key, nombre: row.nombre, reason: 'duplicate_name' })
            continue
          }
        } else {
          omitted.push({
            id: existing.id,
            key,
            nombre: existing.nombre,
            reason: 'replaced_by_better_match',
          })
          byKey.delete(key)
          usedCorrByDist.get(existing.codProvDist)?.delete(existing.codCorr)
        }
      }
    }

    if (byKey.has(key)) {
      omitted.push({ id: row.id, key, nombre: row.nombre, reason: 'duplicate_key_unresolved' })
      continue
    }

    const normalized = {
      ...row,
      codCorr,
      codProvDistCorr,
    }
    byKey.set(key, normalized)
    if (!usedCorrByDist.has(row.codProvDist)) usedCorrByDist.set(row.codProvDist, new Set())
    usedCorrByDist.get(row.codProvDist).add(codCorr)
  }

  return { rows: [...byKey.values()], omitted, reassigned }
}

function parseCorregimientos() {
  const blocks = raw.match(/INSERT INTO `corregimientos`[^;]+;/gs) ?? []
  const rows = []
  const re =
    /\((\d+),\s*'(\d{2})',\s*'([^']*)',\s*'(\d{2})',\s*'(\d{4})',\s*'([^']*)',\s*'(\d{2})',\s*'(\d{6})',\s*'([^']*)',\s*(\d+),\s*(\d+),\s*'([^']*)'\)/g
  for (const block of blocks) {
    let match
    while ((match = re.exec(block))) {
      rows.push({
        id: Number(match[1]),
        codProv: match[2],
        provincia: match[3],
        codDistrito: match[4],
        codProvDist: match[5],
        distrito: match[6],
        codCorr: match[7],
        codProvDistCorr: match[8],
        nombre: match[9],
        idProvincia: Number(match[10]),
        idDistrito: Number(match[11]),
        regional: match[12],
      })
    }
  }
  return dedupeCorregimientos(rows)
}

const provincias = parseProvincias()
const distritos = parseDistritos()
const { rows: corregimientos, omitted: corregimientosOmitidos, reassigned: corregimientosReasignados } =
  parseCorregimientos()

if (!provincias.length || !distritos.length || !corregimientos.length) {
  console.error('No se pudieron parsear datos de db/datosgeograficos.sql')
  process.exit(1)
}

const refSql = `-- Referencia geográfica derivada de db/datosgeograficos.sql (Tribunal Electoral / catálogo TE)
-- Generado por scripts/generate-geo-reference-postgres.js — no editar a mano
-- Provincias: ${provincias.length} | Distritos: ${distritos.length} | Corregimientos: ${corregimientos.length}
-- Duplicados omitidos del origen: ${corregimientosOmitidos.length} | Claves reasignadas: ${corregimientosReasignados.length}

BEGIN;

DROP TABLE IF EXISTS ref_corregimientos CASCADE;
DROP TABLE IF EXISTS ref_distritos CASCADE;
DROP TABLE IF EXISTS ref_provincias CASCADE;

CREATE TABLE ref_provincias (
  id              INTEGER PRIMARY KEY,
  cod_prov        VARCHAR(2) NOT NULL UNIQUE,
  nombre          TEXT NOT NULL
);

CREATE TABLE ref_distritos (
  id              INTEGER PRIMARY KEY,
  cod_prov        VARCHAR(2) NOT NULL REFERENCES ref_provincias (cod_prov),
  provincia       TEXT NOT NULL,
  cod_distrito    VARCHAR(2) NOT NULL,
  nombre          TEXT NOT NULL,
  cod_prov_dist   VARCHAR(4) NOT NULL UNIQUE,
  id_provincia    INTEGER NOT NULL REFERENCES ref_provincias (id),
  UNIQUE (cod_prov, cod_distrito)
);

CREATE TABLE ref_corregimientos (
  id                  INTEGER PRIMARY KEY,
  cod_prov            VARCHAR(2) NOT NULL,
  provincia           TEXT NOT NULL,
  cod_distrito        VARCHAR(2) NOT NULL,
  cod_prov_dist       VARCHAR(4) NOT NULL REFERENCES ref_distritos (cod_prov_dist),
  distrito            TEXT NOT NULL,
  cod_corr            VARCHAR(2) NOT NULL,
  cod_prov_dist_corr  VARCHAR(6) NOT NULL UNIQUE,
  nombre              TEXT NOT NULL,
  id_provincia        INTEGER NOT NULL REFERENCES ref_provincias (id),
  id_distrito         INTEGER NOT NULL REFERENCES ref_distritos (id),
  regional            TEXT NOT NULL
);

INSERT INTO ref_provincias (id, cod_prov, nombre) VALUES
${provincias.map((p) => `  (${p.id}, '${p.codProv}', '${escapePg(p.nombre)}')`).join(',\n')};

INSERT INTO ref_distritos (id, cod_prov, provincia, cod_distrito, nombre, cod_prov_dist, id_provincia) VALUES
${distritos
  .map(
    (d) =>
      `  (${d.id}, '${d.codProv}', '${escapePg(d.provincia)}', '${d.codDistrito}', '${escapePg(d.nombre)}', '${d.codProvDist}', ${d.idProvincia})`,
  )
  .join(',\n')};

INSERT INTO ref_corregimientos (
  id, cod_prov, provincia, cod_distrito, cod_prov_dist, distrito,
  cod_corr, cod_prov_dist_corr, nombre, id_provincia, id_distrito, regional
) VALUES
${corregimientos
  .map(
    (c) =>
      `  (${c.id}, '${c.codProv}', '${escapePg(c.provincia)}', '${c.codDistrito}', '${c.codProvDist}', '${escapePg(c.distrito)}', '${c.codCorr}', '${c.codProvDistCorr}', '${escapePg(c.nombre)}', ${c.idProvincia}, ${c.idDistrito}, '${escapePg(c.regional)}')`,
  )
  .join(',\n')};

COMMIT;
`

const validationSql = `-- Validación del catálogo geográfico (Provincias / Distritos / Corregimientos)
-- Fuente de verdad: db/datosgeograficos.sql → tablas ref_* en db/datosgeograficos_postgres.sql
--
-- Uso:
--   psql -U <usuario> -d <base> -f db/datosgeograficos_postgres.sql
--   psql -U <usuario> -d <base> -f db/migrations/20260526_sync_geo_from_referencia.sql
--   psql -U <usuario> -d <base> -f db/validacion_geo_catalogo.sql
--
-- IMPORTANTE: datosgeograficos_postgres.sql solo carga tablas ref_* (referencia).
-- Para poblar provincias/distritos/corregimientos de la aplicación, ejecute también el script de sync.
--
-- Nota: las tablas operativas pueden tener códigos legacy de ubicacion_geo.csv además de códigos TE nuevos.
-- La comparación se hace por nombre normalizado.

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION geo_norm(txt TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(
    trim(
      regexp_replace(
        regexp_replace(
          translate(
            coalesce(txt, ''),
            'áéíóúüñÁÉÍÓÚÜÑ',
            'aeiouunAEIOUUN'
          ),
          '\\s*\\(CABECERA\\)\\s*',
          ' ',
          'gi'
        ),
        '\\s+',
        ' ',
        'g'
      )
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 1) Resumen del catálogo de referencia (datosgeograficos)
-- ---------------------------------------------------------------------------
SELECT 'REFERENCIA' AS origen,
       (SELECT count(*) FROM ref_provincias) AS provincias,
       (SELECT count(*) FROM ref_distritos) AS distritos,
       (SELECT count(*) FROM ref_corregimientos) AS corregimientos;

-- ---------------------------------------------------------------------------
-- 2) Resumen del catálogo operativo (aplicación)
-- ---------------------------------------------------------------------------
SELECT 'APLICACION' AS origen,
       (SELECT count(*) FROM provincias) AS provincias,
       (SELECT count(*) FROM distritos) AS distritos,
       (SELECT count(*) FROM corregimientos) AS corregimientos;

-- ---------------------------------------------------------------------------
-- 3) Integridad interna del catálogo de referencia
-- ---------------------------------------------------------------------------

-- 3a) Provincias sin distritos
SELECT p.cod_prov, p.nombre AS provincia
FROM ref_provincias p
LEFT JOIN ref_distritos d ON d.id_provincia = p.id
WHERE d.id IS NULL
ORDER BY p.cod_prov;

-- 3b) Distritos sin corregimientos
SELECT d.cod_prov_dist, d.provincia, d.nombre AS distrito
FROM ref_distritos d
LEFT JOIN ref_corregimientos c ON c.id_distrito = d.id
WHERE c.id IS NULL
ORDER BY d.cod_prov_dist;

-- 3c) Corregimientos huérfanos (FK rota)
SELECT c.cod_prov_dist_corr, c.nombre, c.id_distrito, c.id_provincia
FROM ref_corregimientos c
LEFT JOIN ref_distritos d ON d.id = c.id_distrito
LEFT JOIN ref_provincias p ON p.id = c.id_provincia
WHERE d.id IS NULL OR p.id IS NULL;

-- 3d) Duplicados por clave compuesta en referencia
SELECT cod_prov_dist, count(*) AS veces
FROM ref_distritos
GROUP BY cod_prov_dist
HAVING count(*) > 1;

SELECT cod_prov_dist_corr, count(*) AS veces
FROM ref_corregimientos
GROUP BY cod_prov_dist_corr
HAVING count(*) > 1;

-- ---------------------------------------------------------------------------
-- 4) Cobertura por provincia (referencia vs aplicación por nombre)
-- ---------------------------------------------------------------------------
WITH ref AS (
  SELECT
    p.cod_prov,
    geo_norm(p.nombre) AS provincia_norm,
    p.nombre AS provincia,
    count(DISTINCT d.id) AS distritos_ref,
    count(c.id) AS corregimientos_ref
  FROM ref_provincias p
  LEFT JOIN ref_distritos d ON d.id_provincia = p.id
  LEFT JOIN ref_corregimientos c ON c.id_distrito = d.id
  GROUP BY p.cod_prov, p.nombre
),
app AS (
  SELECT
    pr.codigo,
    geo_norm(pr.nombre) AS provincia_norm,
    pr.nombre AS provincia,
    count(DISTINCT di.codigo) AS distritos_app,
    count(co.codigo) AS corregimientos_app
  FROM provincias pr
  LEFT JOIN distritos di ON di."provinciaCodigo" = pr.codigo
  LEFT JOIN corregimientos co ON co."distritoCodigo" = di.codigo
  GROUP BY pr.codigo, pr.nombre
)
SELECT
  r.cod_prov,
  coalesce(r.provincia, a.provincia) AS provincia,
  r.distritos_ref,
  a.distritos_app,
  r.distritos_ref - coalesce(a.distritos_app, 0) AS delta_distritos,
  r.corregimientos_ref,
  a.corregimientos_app,
  r.corregimientos_ref - coalesce(a.corregimientos_app, 0) AS delta_corregimientos,
  CASE
    WHEN a.provincia IS NULL THEN 'FALTA PROVINCIA EN APP'
    WHEN r.distritos_ref > coalesce(a.distritos_app, 0) THEN 'FALTAN DISTRITOS'
    WHEN r.corregimientos_ref > coalesce(a.corregimientos_app, 0) THEN 'FALTAN CORREGIMIENTOS'
    ELSE 'OK'
  END AS estado
FROM ref r
FULL OUTER JOIN app a ON a.provincia_norm = r.provincia_norm
ORDER BY r.cod_prov NULLS LAST, a.codigo NULLS LAST;

-- ---------------------------------------------------------------------------
-- 5) Provincias en referencia que NO existen en la aplicación (por nombre)
-- ---------------------------------------------------------------------------
SELECT r.cod_prov, r.nombre AS provincia_referencia
FROM ref_provincias r
WHERE NOT EXISTS (
  SELECT 1 FROM provincias p WHERE geo_norm(p.nombre) = geo_norm(r.nombre)
)
ORDER BY r.cod_prov;

-- ---------------------------------------------------------------------------
-- 6) Distritos en referencia que NO existen en la aplicación (provincia + nombre)
-- ---------------------------------------------------------------------------
SELECT
  rd.cod_prov_dist,
  rd.provincia,
  rd.nombre AS distrito_referencia,
  count(rc.id) AS corregimientos_en_referencia
FROM ref_distritos rd
LEFT JOIN ref_corregimientos rc ON rc.id_distrito = rd.id
WHERE NOT EXISTS (
  SELECT 1
  FROM distritos d
  JOIN provincias p ON p.codigo = d."provinciaCodigo"
  WHERE geo_norm(p.nombre) = geo_norm(rd.provincia)
    AND geo_norm(d.nombre) = geo_norm(rd.nombre)
)
GROUP BY rd.cod_prov_dist, rd.provincia, rd.nombre
ORDER BY rd.cod_prov_dist;

-- ---------------------------------------------------------------------------
-- 7) Corregimientos en referencia que NO existen en la aplicación
-- ---------------------------------------------------------------------------
SELECT
  rc.cod_prov_dist_corr,
  rc.provincia,
  rc.distrito,
  rc.nombre AS corregimiento_referencia
FROM ref_corregimientos rc
WHERE NOT EXISTS (
  SELECT 1
  FROM corregimientos c
  JOIN distritos d ON d.codigo = c."distritoCodigo"
  JOIN provincias p ON p.codigo = d."provinciaCodigo"
  WHERE geo_norm(p.nombre) = geo_norm(rc.provincia)
    AND geo_norm(d.nombre) = geo_norm(rc.distrito)
    AND geo_norm(c.nombre) = geo_norm(rc.nombre)
)
ORDER BY rc.cod_prov_dist_corr;

-- ---------------------------------------------------------------------------
-- 8) Resumen ejecutivo de faltantes
-- ---------------------------------------------------------------------------
SELECT 'provincias_faltantes_en_app' AS metrica,
       count(*) AS total
FROM ref_provincias r
WHERE NOT EXISTS (
  SELECT 1 FROM provincias p WHERE geo_norm(p.nombre) = geo_norm(r.nombre)
)
UNION ALL
SELECT 'distritos_faltantes_en_app', count(*)
FROM ref_distritos rd
WHERE NOT EXISTS (
  SELECT 1
  FROM distritos d
  JOIN provincias p ON p.codigo = d."provinciaCodigo"
  WHERE geo_norm(p.nombre) = geo_norm(rd.provincia)
    AND geo_norm(d.nombre) = geo_norm(rd.nombre)
)
UNION ALL
SELECT 'corregimientos_faltantes_en_app', count(*)
FROM ref_corregimientos rc
WHERE NOT EXISTS (
  SELECT 1
  FROM corregimientos c
  JOIN distritos d ON d.codigo = c."distritoCodigo"
  JOIN provincias p ON p.codigo = d."provinciaCodigo"
  WHERE geo_norm(p.nombre) = geo_norm(rc.provincia)
    AND geo_norm(d.nombre) = geo_norm(rc.distrito)
    AND geo_norm(c.nombre) = geo_norm(rc.nombre)
)
UNION ALL
SELECT 'distritos_sin_corregimientos_referencia', count(*)
FROM ref_distritos d
LEFT JOIN ref_corregimientos c ON c.id_distrito = d.id
WHERE c.id IS NULL
UNION ALL
SELECT 'provincias_sin_distritos_referencia', count(*)
FROM ref_provincias p
LEFT JOIN ref_distritos d ON d.id_provincia = p.id
WHERE d.id IS NULL;

-- ---------------------------------------------------------------------------
-- 9) Veredicto rápido (debe devolver 0 filas si todo está completo)
-- ---------------------------------------------------------------------------
SELECT *
FROM (
  SELECT 'provincias_faltantes' AS problema, r.cod_prov AS clave, r.nombre AS detalle
  FROM ref_provincias r
  WHERE NOT EXISTS (
    SELECT 1 FROM provincias p WHERE geo_norm(p.nombre) = geo_norm(r.nombre)
  )
  UNION ALL
  SELECT 'distritos_faltantes', rd.cod_prov_dist, rd.provincia || ' / ' || rd.nombre
  FROM ref_distritos rd
  WHERE NOT EXISTS (
    SELECT 1
    FROM distritos d
    JOIN provincias p ON p.codigo = d."provinciaCodigo"
    WHERE geo_norm(p.nombre) = geo_norm(rd.provincia)
      AND geo_norm(d.nombre) = geo_norm(rd.nombre)
  )
  UNION ALL
  SELECT 'corregimientos_faltantes', rc.cod_prov_dist_corr, rc.provincia || ' / ' || rc.distrito || ' / ' || rc.nombre
  FROM ref_corregimientos rc
  WHERE NOT EXISTS (
    SELECT 1
    FROM corregimientos c
    JOIN distritos d ON d.codigo = c."distritoCodigo"
    JOIN provincias p ON p.codigo = d."provinciaCodigo"
    WHERE geo_norm(p.nombre) = geo_norm(rc.provincia)
      AND geo_norm(d.nombre) = geo_norm(rc.distrito)
      AND geo_norm(c.nombre) = geo_norm(rc.nombre)
  )
  UNION ALL
  SELECT 'distrito_sin_corregimientos_ref', d.cod_prov_dist, d.provincia || ' / ' || d.nombre
  FROM ref_distritos d
  LEFT JOIN ref_corregimientos c ON c.id_distrito = d.id
  WHERE c.id IS NULL
) problemas
ORDER BY problema, clave;
`

fs.writeFileSync(refSqlPath, refSql, 'utf8')
fs.writeFileSync(validationPath, validationSql, 'utf8')

console.log(`✓ ${refSqlPath}`)
console.log(`  Provincias: ${provincias.length}, Distritos: ${distritos.length}, Corregimientos: ${corregimientos.length}`)
if (corregimientosOmitidos.length) {
  console.log(`  Omitidos (duplicados en origen): ${corregimientosOmitidos.length}`)
  corregimientosOmitidos.forEach((o) => console.log(`    - id ${o.id} [${o.key}] ${o.nombre} (${o.reason})`))
}
if (corregimientosReasignados.length) {
  console.log(`  Reasignados: ${corregimientosReasignados.length}`)
  corregimientosReasignados.forEach((r) => console.log(`    - id ${r.id} ${r.nombre}: ${r.from} → ${r.to}`))
}
console.log(`✓ ${validationPath}`)
