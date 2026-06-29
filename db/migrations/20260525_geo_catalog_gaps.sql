-- Catálogo geográfico: distritos/corregimientos faltantes (Informe QA Hospital Santa Fe).
-- Incluido automáticamente en npm run backend:init y npm run backend:sync-geo.

INSERT INTO distritos (codigo, nombre, "provinciaCodigo")
SELECT '62', 'TONOSI', '7'
WHERE NOT EXISTS (SELECT 1 FROM distritos WHERE codigo = '62' AND "provinciaCodigo" = '7');

INSERT INTO distritos (codigo, nombre, "provinciaCodigo")
SELECT '35', 'OMAR TORRIJOS HERRERA', '3'
WHERE NOT EXISTS (SELECT 1 FROM distritos WHERE codigo = '35' AND "provinciaCodigo" = '3');

INSERT INTO distritos (codigo, nombre, "provinciaCodigo")
SELECT '49', 'JIRONDAI', '12'
WHERE NOT EXISTS (SELECT 1 FROM distritos WHERE codigo = '49' AND "provinciaCodigo" = '12');

INSERT INTO corregimientos (codigo, nombre, "distritoCodigo")
SELECT v.codigo, v.nombre, v.distrito
FROM (VALUES
  ('158', 'GUALA', '25'),
  ('900', 'TONOSI', '62'),
  ('901', 'LA TRONOSA', '62'),
  ('902', 'OMAR TORRIJOS HERRERA', '35'),
  ('903', 'SAN JUAN', '35'),
  ('904', 'JIRONDAI', '49'),
  ('905', 'BAJO TRINIDAD', '49')
) AS v(codigo, nombre, distrito)
WHERE NOT EXISTS (SELECT 1 FROM corregimientos c WHERE c.codigo = v.codigo);
