-- =============================================================================
-- Hospital Santa Fe — Limpieza operativa para reiniciar pruebas (producción/QA)
-- =============================================================================
-- Qué hace:
--   1. Elimina TODAS las preadmisiones.
--   2. Elimina TODOS los tickets/colas y encuestas.
--   3. Limpia integration_logs (Cellbyte).
--   4. Reinicia secuencias de IDs (preadmissions, tickets, surveys, integration_logs).
--
-- Qué NO toca (se preservan):
--   - users (pacientes y personal)
--   - services / sedes / tipos de ticket
--   - provincias / distritos / corregimientos
--   - role_permissions / admin_role_matrix_rows
--   - app_settings / monitor_media
--   - audit_logs
--
-- Cómo ejecutar (recomendado — backup + SQL + adjuntos):
--   sudo bash /opt/hospitalsantafe/scripts/reset-preadmissions-for-retest.sh
--
-- Manual (solo SQL, con DATABASE_URL):
--   set -a; source /opt/hospitalsantafe/.env; set +a
--   pg_dump "$DATABASE_URL" -Fc -f /tmp/hsf_backup_$(date +%Y%m%d).dump
--   psql "$DATABASE_URL" -f db/scripts/reset_preadmissions_for_retest.sql
--
-- IMPORTANTE:
--   - Haga backup antes (el .sh lo hace automáticamente).
--   - Los adjuntos en disco NO se borran con SQL; el .sh limpia
--     PREADMISSION_UPLOAD_DIR.
--   - Los números de ticket (CTA-0338, etc.) se generan aleatorios; no hay
--     consecutivo de ticket en BD. Sí se reinicia el id interno (1, 2, 3…).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Conteos previos
-- -----------------------------------------------------------------------------
SELECT 'ANTES' AS momento,
       (SELECT count(*) FROM preadmissions) AS preadmissions,
       (SELECT count(*) FROM tickets) AS tickets,
       (SELECT count(*) FROM surveys) AS surveys,
       (SELECT count(*) FROM integration_logs) AS integration_logs;

-- -----------------------------------------------------------------------------
-- 1) Encuestas (FK → tickets)
-- -----------------------------------------------------------------------------
DELETE FROM surveys;

-- -----------------------------------------------------------------------------
-- 2) Desvincular preadmisiones ↔ tickets
-- -----------------------------------------------------------------------------
UPDATE preadmissions
SET "ticketId" = NULL
WHERE "ticketId" IS NOT NULL;

UPDATE tickets
SET "preadmissionId" = NULL
WHERE "preadmissionId" IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3) Tickets / colas (todos en cero)
-- -----------------------------------------------------------------------------
DELETE FROM tickets;

-- -----------------------------------------------------------------------------
-- 4) Logs de integración Cellbyte
-- -----------------------------------------------------------------------------
DELETE FROM integration_logs;

-- -----------------------------------------------------------------------------
-- 5) Preadmisiones
-- -----------------------------------------------------------------------------
DELETE FROM preadmissions;

-- -----------------------------------------------------------------------------
-- 6) Reiniciar secuencias (próximo id = 1)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  seq_name text;
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'preadmissions',
    'tickets',
    'surveys',
    'integration_logs'
  ]
  LOOP
    SELECT pg_get_serial_sequence(tbl, 'id') INTO seq_name;
    IF seq_name IS NOT NULL THEN
      EXECUTE format('ALTER SEQUENCE %s RESTART WITH 1', seq_name);
      EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
      RAISE NOTICE 'Secuencia reiniciada: % (próximo id = 1)', seq_name;
    ELSE
      RAISE NOTICE 'No se encontró secuencia para %.id', tbl;
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 7) Conteos posteriores (deben ser 0)
-- -----------------------------------------------------------------------------
SELECT 'DESPUES' AS momento,
       (SELECT count(*) FROM preadmissions) AS preadmissions,
       (SELECT count(*) FROM tickets) AS tickets,
       (SELECT count(*) FROM surveys) AS surveys,
       (SELECT count(*) FROM integration_logs) AS integration_logs;

SELECT
  setval(pg_get_serial_sequence('preadmissions', 'id'), 1, false) AS preadmissions_next_id,
  setval(pg_get_serial_sequence('tickets', 'id'), 1, false) AS tickets_next_id;

COMMIT;

-- =============================================================================
-- Post-SQL (adjuntos en disco):
--   sudo rm -rf /var/lib/hospitalsantafe/preadmissions/*
--   # o la ruta de PREADMISSION_UPLOAD_DIR en .env
-- =============================================================================
