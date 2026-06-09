-- Sincroniza provincias, distritos y corregimientos operativos desde las tablas ref_* (datosgeograficos).
--
-- Prerequisitos:
--   1. psql ... -f db/datosgeograficos_postgres.sql
--   2. Ejecutar este script
--   3. (Opcional) psql ... -f db/validacion_geo_catalogo.sql
--
-- No elimina registros existentes. Inserta solo lo que falta (match por nombre normalizado).
-- Los distritos nuevos usan codigo = cod_prov_dist TE (ej. 0104). Los corregimientos nuevos usan cod_prov_dist_corr (ej. 010401).

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

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Provincias faltantes
-- ---------------------------------------------------------------------------
INSERT INTO provincias (codigo, nombre)
SELECT DISTINCT
  (CAST(r.cod_prov AS INTEGER))::TEXT AS codigo,
  r.nombre
FROM ref_provincias r
WHERE NOT EXISTS (
  SELECT 1 FROM provincias p WHERE geo_norm(p.nombre) = geo_norm(r.nombre)
)
AND NOT EXISTS (
  SELECT 1 FROM provincias p WHERE p.codigo = (CAST(r.cod_prov AS INTEGER))::TEXT
);

-- ---------------------------------------------------------------------------
-- 2) Distritos faltantes (por provincia + nombre)
-- ---------------------------------------------------------------------------
INSERT INTO distritos (codigo, nombre, "provinciaCodigo")
SELECT
  rd.cod_prov_dist,
  rd.nombre,
  p.codigo AS "provinciaCodigo"
FROM ref_distritos rd
JOIN ref_provincias rp ON rp.id = rd.id_provincia
JOIN provincias p ON geo_norm(p.nombre) = geo_norm(rp.nombre)
WHERE NOT EXISTS (
  SELECT 1
  FROM distritos d
  WHERE d."provinciaCodigo" = p.codigo
    AND geo_norm(d.nombre) = geo_norm(rd.nombre)
)
AND NOT EXISTS (
  SELECT 1 FROM distritos d WHERE d.codigo = rd.cod_prov_dist
);

-- ---------------------------------------------------------------------------
-- 3) Corregimientos faltantes (por provincia + distrito + nombre)
-- ---------------------------------------------------------------------------
INSERT INTO corregimientos (codigo, nombre, "distritoCodigo")
SELECT
  rc.cod_prov_dist_corr,
  rc.nombre,
  d.codigo AS "distritoCodigo"
FROM ref_corregimientos rc
JOIN ref_distritos rd ON rd.id = rc.id_distrito
JOIN ref_provincias rp ON rp.id = rc.id_provincia
JOIN provincias p ON geo_norm(p.nombre) = geo_norm(rp.nombre)
JOIN distritos d
  ON d."provinciaCodigo" = p.codigo
 AND geo_norm(d.nombre) = geo_norm(rd.nombre)
WHERE NOT EXISTS (
  SELECT 1
  FROM corregimientos c
  JOIN distritos d2 ON d2.codigo = c."distritoCodigo"
  WHERE d2."provinciaCodigo" = p.codigo
    AND geo_norm(d2.nombre) = geo_norm(rd.nombre)
    AND geo_norm(c.nombre) = geo_norm(rc.nombre)
)
AND NOT EXISTS (
  SELECT 1 FROM corregimientos c WHERE c.codigo = rc.cod_prov_dist_corr
);

COMMIT;

-- ---------------------------------------------------------------------------
-- Resumen post-sincronización
-- ---------------------------------------------------------------------------
SELECT 'REFERENCIA' AS origen,
       (SELECT count(*) FROM ref_provincias) AS provincias,
       (SELECT count(*) FROM ref_distritos) AS distritos,
       (SELECT count(*) FROM ref_corregimientos) AS corregimientos
UNION ALL
SELECT 'APLICACION',
       (SELECT count(*) FROM provincias),
       (SELECT count(*) FROM distritos),
       (SELECT count(*) FROM corregimientos);
