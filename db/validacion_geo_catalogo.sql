-- Validación del catálogo geográfico (Provincias / Distritos / Corregimientos)
-- Fuente de verdad: db/datosgeograficos.sql → tablas ref_* en db/datosgeograficos_postgres.sql
--
-- Uso:
--   psql -U <usuario> -d <base> -f db/datosgeograficos_postgres.sql
--   psql -U <usuario> -d <base> -f db/migrations/20260526_sync_geo_from_referencia.sql
--   psql -U <usuario> -d <base> -f db/validacion_geo_catalogo.sql
--   psql -U <usuario> -d <base> -f db/validacion_geo_duplicados.sql
--
-- IMPORTANTE: datosgeograficos_postgres.sql solo carga tablas ref_* (referencia).
-- Para poblar provincias/distritos/corregimientos de la aplicación, ejecute también el script de sync.

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
          '\s*\(CABECERA\)\s*',
          ' ',
          'gi'
        ),
        '\s+',
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
