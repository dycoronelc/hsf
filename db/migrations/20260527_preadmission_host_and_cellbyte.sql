-- Columnas usadas por lista de llegadas (anfitrión) e integración Cellbyte.
-- Ejecutar en Railway si work-list devuelve 500 por columnas faltantes:
--   psql "$DATABASE_PUBLIC_URL" -f db/migrations/20260527_preadmission_host_and_cellbyte.sql

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "registradoComo" TEXT NOT NULL DEFAULT 'paciente';

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "procedimientoEstudio" TEXT;

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "preautorizacion" VARCHAR(512);

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "certificadoSeguro" VARCHAR(512);

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "celularPrefix" TEXT DEFAULT '507';

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "arrivalState" TEXT NOT NULL DEFAULT 'espera_llegada';

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "confirmedArrivalAt" TIMESTAMP;

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "confirmedArrivalByUserId" INTEGER REFERENCES public.users(id);

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "ticketId" INTEGER;

ALTER TABLE public.preadmissions
  ADD COLUMN IF NOT EXISTS "cellbyteSentAt" TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_preadmissions_arrival_state
  ON public.preadmissions ("arrivalState");
