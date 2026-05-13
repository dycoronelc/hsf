-- =============================================================================
-- Post-despliegue: eliminar tabla legacy `appointments` (módulo de citas retirado)
-- y añadir índices alineados con consultas del backend (TypeORM).
--
-- Ejecutar en Railway / psql con el usuario que posee el esquema public, p. ej.:
--   psql "$DATABASE_PUBLIC_URL" -f db/migrations/20260513_drop_legacy_appointments.sql
--
-- La tabla `appointments` solo tenía FKs salientes a `users` y `services`;
-- ningún otro objeto del dump referencia esta tabla, por lo que DROP TABLE basta.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS public.appointments CASCADE;

COMMIT;

-- Índices (idempotentes). Crear fuera del bloque anterior para evitar locks largos
-- en entornos con tráfico; en un entorno de prueba puede ejecutarse todo junto.

CREATE INDEX IF NOT EXISTS idx_preadmissions_cedula_pasaporte
  ON public.preadmissions (cedula, pasaporte);

CREATE INDEX IF NOT EXISTS idx_preadmissions_patientid
  ON public.preadmissions ("patientId")
  WHERE "patientId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_preadmissions_arrival_state
  ON public.preadmissions ("arrivalState");

CREATE INDEX IF NOT EXISTS idx_tickets_service_status
  ON public.tickets ("serviceId", status);

CREATE INDEX IF NOT EXISTS idx_tickets_patientid
  ON public.tickets ("patientId")
  WHERE "patientId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_preadmissionid
  ON public.tickets ("preadmissionId")
  WHERE "preadmissionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_logs_preadmissionid
  ON public.integration_logs ("preadmissionId")
  WHERE "preadmissionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs ("entityType", "entityId")
  WHERE "entityType" IS NOT NULL AND "entityId" IS NOT NULL;
