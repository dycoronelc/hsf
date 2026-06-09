-- Detección de duplicados en el catálogo geográfico operativo (provincias / distritos / corregimientos).
--
-- Uso (requiere geo_norm; ya existe si ejecutó validacion_geo_catalogo.sql o sync):
--   psql -U <usuario> -d <base> -f db/validacion_geo_duplicados.sql
--
-- Interpretación:
--   • 0 filas en "Resumen" = sin duplicados semánticos detectados.
--   • Duplicados legacy + TE: mismo nombre normalizado, distinto codigo (ej. distrito 9 y 0101).

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
-- A) Resumen ejecutivo (0 filas = OK)
-- ---------------------------------------------------------------------------
SELECT tipo, grupos_duplicados, registros_involucrados
FROM (
  SELECT 'provincias_mismo_nombre' AS tipo,
         count(*)::bigint AS grupos_duplicados,
         coalesce(sum(cnt), 0)::bigint AS registros_involucrados
  FROM (
    SELECT geo_norm(nombre) AS k, count(*) AS cnt
    FROM provincias
    GROUP BY geo_norm(nombre)
    HAVING count(*) > 1
  ) t

  UNION ALL

  SELECT 'distritos_misma_provincia_y_nombre',
         count(*),
         coalesce(sum(cnt), 0)
  FROM (
    SELECT p.codigo, geo_norm(d.nombre) AS k, count(*) AS cnt
    FROM distritos d
    JOIN provincias p ON p.codigo = d."provinciaCodigo"
    GROUP BY p.codigo, geo_norm(d.nombre)
    HAVING count(*) > 1
  ) t

  UNION ALL

  SELECT 'corregimientos_mismo_distrito_y_nombre',
         count(*),
         coalesce(sum(cnt), 0)
  FROM (
    SELECT c."distritoCodigo", geo_norm(c.nombre) AS k, count(*) AS cnt
    FROM corregimientos c
    GROUP BY c."distritoCodigo", geo_norm(c.nombre)
    HAVING count(*) > 1
  ) t

  UNION ALL

  SELECT 'corregimientos_misma_provincia_distrito_y_nombre',
         count(*),
         coalesce(sum(cnt), 0)
  FROM (
    SELECT
      p.codigo AS prov,
      geo_norm(d.nombre) AS dist,
      geo_norm(c.nombre) AS corr,
      count(*) AS cnt
    FROM corregimientos c
    JOIN distritos d ON d.codigo = c."distritoCodigo"
    JOIN provincias p ON p.codigo = d."provinciaCodigo"
    GROUP BY p.codigo, geo_norm(d.nombre), geo_norm(c.nombre)
    HAVING count(*) > 1
  ) t

  UNION ALL

  SELECT 'distritos_mismo_nombre_en_misma_provincia_por_nombre_prov',
         count(*),
         coalesce(sum(cnt), 0)
  FROM (
    SELECT geo_norm(p.nombre) AS prov, geo_norm(d.nombre) AS dist, count(*) AS cnt
    FROM distritos d
    JOIN provincias p ON p.codigo = d."provinciaCodigo"
    GROUP BY geo_norm(p.nombre), geo_norm(d.nombre)
    HAVING count(*) > 1
  ) t
) resumen
WHERE grupos_duplicados > 0
ORDER BY tipo;

-- ---------------------------------------------------------------------------
-- B) Provincias duplicadas (mismo nombre normalizado)
-- ---------------------------------------------------------------------------
SELECT
  geo_norm(p.nombre) AS nombre_normalizado,
  count(*) AS cantidad,
  string_agg(p.codigo, ', ' ORDER BY p.codigo) AS codigos,
  string_agg(p.nombre, ' | ' ORDER BY p.codigo) AS nombres_originales
FROM provincias p
GROUP BY geo_norm(p.nombre)
HAVING count(*) > 1
ORDER BY nombre_normalizado;

-- ---------------------------------------------------------------------------
-- C) Distritos duplicados en la misma provincia (por nombre de provincia + distrito)
--    Detecta pares legacy/TE: ej. codigo 9 y 0101 ambos "Bocas del Toro"
-- ---------------------------------------------------------------------------
SELECT
  geo_norm(p.nombre) AS provincia,
  geo_norm(d.nombre) AS distrito_normalizado,
  count(*) AS cantidad,
  string_agg(d.codigo, ', ' ORDER BY d.codigo) AS codigos_distrito,
  string_agg(d.nombre, ' | ' ORDER BY d.codigo) AS nombres_originales
FROM distritos d
JOIN provincias p ON p.codigo = d."provinciaCodigo"
GROUP BY geo_norm(p.nombre), geo_norm(d.nombre)
HAVING count(*) > 1
ORDER BY provincia, distrito_normalizado;

-- ---------------------------------------------------------------------------
-- D) Corregimientos duplicados (misma provincia + distrito + nombre)
--    El caso más frecuente tras sync CSV + TE
-- ---------------------------------------------------------------------------
SELECT
  geo_norm(p.nombre) AS provincia,
  geo_norm(d.nombre) AS distrito,
  geo_norm(c.nombre) AS corregimiento_normalizado,
  count(*) AS cantidad,
  string_agg(c.codigo, ', ' ORDER BY c.codigo) AS codigos_corregimiento,
  string_agg(d.codigo, ', ' ORDER BY d.codigo) AS codigos_distrito,
  string_agg(c.nombre, ' | ' ORDER BY c.codigo) AS nombres_originales
FROM corregimientos c
JOIN distritos d ON d.codigo = c."distritoCodigo"
JOIN provincias p ON p.codigo = d."provinciaCodigo"
GROUP BY geo_norm(p.nombre), geo_norm(d.nombre), geo_norm(c.nombre)
HAVING count(*) > 1
ORDER BY provincia, distrito, corregimiento_normalizado;

-- ---------------------------------------------------------------------------
-- E) Corregimientos duplicados dentro del mismo codigo de distrito
-- ---------------------------------------------------------------------------
SELECT
  c."distritoCodigo" AS codigo_distrito,
  d.nombre AS distrito,
  geo_norm(c.nombre) AS corregimiento_normalizado,
  count(*) AS cantidad,
  string_agg(c.codigo, ', ' ORDER BY c.codigo) AS codigos_corregimiento
FROM corregimientos c
JOIN distritos d ON d.codigo = c."distritoCodigo"
GROUP BY c."distritoCodigo", d.nombre, geo_norm(c.nombre)
HAVING count(*) > 1
ORDER BY codigo_distrito, corregimiento_normalizado;

-- ---------------------------------------------------------------------------
-- F) Conteo: registros únicos vs totales (aplicación)
-- ---------------------------------------------------------------------------
SELECT 'provincias' AS nivel,
       count(*) AS total_filas,
       count(DISTINCT geo_norm(nombre)) AS nombres_unicos,
       count(*) - count(DISTINCT geo_norm(nombre)) AS filas_duplicadas_por_nombre
FROM provincias
UNION ALL
SELECT 'distritos',
       count(*),
       count(DISTINCT geo_norm(p.nombre) || '|' || geo_norm(d.nombre)),
       count(*) - count(DISTINCT geo_norm(p.nombre) || '|' || geo_norm(d.nombre))
FROM distritos d
JOIN provincias p ON p.codigo = d."provinciaCodigo"
UNION ALL
SELECT 'corregimientos',
       count(*),
       count(DISTINCT geo_norm(p.nombre) || '|' || geo_norm(d.nombre) || '|' || geo_norm(c.nombre)),
       count(*) - count(DISTINCT geo_norm(p.nombre) || '|' || geo_norm(d.nombre) || '|' || geo_norm(c.nombre))
FROM corregimientos c
JOIN distritos d ON d.codigo = c."distritoCodigo"
JOIN provincias p ON p.codigo = d."provinciaCodigo";

-- ---------------------------------------------------------------------------
-- G) Códigos huérfanos (integridad referencial)
-- ---------------------------------------------------------------------------
SELECT 'distritos_sin_provincia' AS problema, d.codigo, d.nombre
FROM distritos d
LEFT JOIN provincias p ON p.codigo = d."provinciaCodigo"
WHERE p.codigo IS NULL
UNION ALL
SELECT 'corregimientos_sin_distrito', c.codigo, c.nombre
FROM corregimientos c
LEFT JOIN distritos d ON d.codigo = c."distritoCodigo"
WHERE d.codigo IS NULL
ORDER BY problema, codigo;

-- ---------------------------------------------------------------------------
-- H) Veredicto rápido (0 filas = sin duplicados semánticos)
-- ---------------------------------------------------------------------------
SELECT * FROM (
  SELECT 'provincia_dup' AS tipo, geo_norm(nombre) AS clave, string_agg(codigo, ',') AS codigos
  FROM provincias
  GROUP BY geo_norm(nombre)
  HAVING count(*) > 1

  UNION ALL

  SELECT 'distrito_dup', geo_norm(p.nombre) || ' / ' || geo_norm(d.nombre), string_agg(d.codigo, ',')
  FROM distritos d
  JOIN provincias p ON p.codigo = d."provinciaCodigo"
  GROUP BY geo_norm(p.nombre), geo_norm(d.nombre)
  HAVING count(*) > 1

  UNION ALL

  SELECT 'corregimiento_dup',
         geo_norm(p.nombre) || ' / ' || geo_norm(d.nombre) || ' / ' || geo_norm(c.nombre),
         string_agg(c.codigo, ',')
  FROM corregimientos c
  JOIN distritos d ON d.codigo = c."distritoCodigo"
  JOIN provincias p ON p.codigo = d."provinciaCodigo"
  GROUP BY geo_norm(p.nombre), geo_norm(d.nombre), geo_norm(c.nombre)
  HAVING count(*) > 1
) v
ORDER BY tipo, clave;
