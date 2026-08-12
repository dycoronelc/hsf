#!/usr/bin/env bash
#
# Reinicio operativo de preadmisiones / tickets / colas — Hospital Santa Fe
#
# Ejecuta:
#   1) Backup PostgreSQL (pg_dump)
#   2) Script SQL de limpieza + reinicio de secuencias
#   3) Limpieza de adjuntos en disco (PREADMISSION_UPLOAD_DIR)
#
# Uso (en el servidor):
#   sudo bash /opt/hospitalsantafe/scripts/reset-preadmissions-for-retest.sh
#
# O desde el repo:
#   cd /opt/hospitalsantafe && sudo bash scripts/reset-preadmissions-for-retest.sh
#
# Variables opcionales:
#   APP_DIR=/opt/hospitalsantafe
#   APP_USER=hospitalsantafe
#   BACKUP_DIR=/var/backups/hospitalsantafe
#   SKIP_BACKUP=1          # omitir pg_dump (no recomendado)
#   SKIP_UPLOADS=1         # no borrar adjuntos en disco
#   FORCE=1                # no pedir confirmación interactiva
#   CONFIRM=YES            # alternativa no interactiva a FORCE=1
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hospitalsantafe}"
APP_USER="${APP_USER:-hospitalsantafe}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hospitalsantafe}"
SQL_FILE="${SQL_FILE:-$APP_DIR/db/scripts/reset_preadmissions_for_retest.sql}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"

log() { echo "[reset-retest] $*"; }
die() { echo "[reset-retest] ERROR: $*" >&2; exit 1; }

if [[ ! -d "$APP_DIR" ]]; then
  die "No existe APP_DIR=$APP_DIR"
fi

if [[ ! -f "$SQL_FILE" ]]; then
  die "No existe el SQL: $SQL_FILE (haga git pull en $APP_DIR)"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  die "No existe $ENV_FILE (necesita DATABASE_URL)"
fi

# Cargar variables de entorno de la app
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  die "DATABASE_URL no está definido en $ENV_FILE"
fi

UPLOAD_DIR="${PREADMISSION_UPLOAD_DIR:-$APP_DIR/backend/uploads/preadmissions}"

log "Directorio app: $APP_DIR"
log "SQL: $SQL_FILE"
log "Adjuntos: $UPLOAD_DIR"
log "Backup dir: $BACKUP_DIR"

echo
echo "================================================================="
echo "  ATENCIÓN: esto BORRARÁ todas las preadmisiones, tickets,"
echo "  colas, encuestas e integration_logs, y reiniciará IDs a 1."
echo "  NO borra usuarios, servicios, geo, permisos ni settings."
echo "================================================================="
echo

if [[ "${FORCE:-0}" != "1" && "${CONFIRM:-}" != "YES" ]]; then
  read -r -p "Escriba YES para continuar: " answer
  if [[ "$answer" != "YES" ]]; then
    die "Cancelado (no escribió YES)."
  fi
fi

# ---------------------------------------------------------------------------
# 1) Backup
# ---------------------------------------------------------------------------
BACKUP_FILE=""
if [[ "${SKIP_BACKUP:-0}" != "1" ]]; then
  if ! command -v pg_dump >/dev/null 2>&1; then
    die "pg_dump no está instalado. Instale postgresql-client o use SKIP_BACKUP=1"
  fi
  mkdir -p "$BACKUP_DIR"
  if [[ "$(id -u)" -eq 0 ]]; then
    chown "$APP_USER:$APP_USER" "$BACKUP_DIR" 2>/dev/null || true
  fi
  BACKUP_FILE="$BACKUP_DIR/hsf_retest_$(date +%Y%m%d_%H%M%S).dump"
  log "Creando backup: $BACKUP_FILE"
  if [[ "$(id -u)" -eq 0 ]] && id "$APP_USER" &>/dev/null; then
    sudo -u "$APP_USER" pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_FILE"
  else
    pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_FILE"
  fi
  log "Backup OK ($(du -h "$BACKUP_FILE" | awk '{print $1}'))"
else
  log "Omitiendo backup (SKIP_BACKUP=1)"
fi

# ---------------------------------------------------------------------------
# 2) SQL de limpieza
# ---------------------------------------------------------------------------
if ! command -v psql >/dev/null 2>&1; then
  die "psql no está instalado. Instale postgresql-client."
fi

log "Ejecutando limpieza SQL..."
if [[ "$(id -u)" -eq 0 ]] && id "$APP_USER" &>/dev/null; then
  sudo -u "$APP_USER" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
else
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
fi
log "SQL OK"

# ---------------------------------------------------------------------------
# 3) Adjuntos en disco
# ---------------------------------------------------------------------------
if [[ "${SKIP_UPLOADS:-0}" != "1" ]]; then
  if [[ -d "$UPLOAD_DIR" ]]; then
    log "Limpiando adjuntos en $UPLOAD_DIR ..."
    # Borrar contenido, no el directorio raíz (mantiene permisos/montaje)
    find "$UPLOAD_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    if [[ "$(id -u)" -eq 0 ]] && id "$APP_USER" &>/dev/null; then
      chown -R "$APP_USER:$APP_USER" "$UPLOAD_DIR" 2>/dev/null || true
    fi
    log "Adjuntos OK (carpeta vacía)"
  else
    log "No existe $UPLOAD_DIR — se omite limpieza de adjuntos"
  fi
else
  log "Omitiendo adjuntos (SKIP_UPLOADS=1)"
fi

echo
log "Listo. Preadmisiones/tickets/colas en cero; IDs reiniciados."
if [[ -n "$BACKUP_FILE" ]]; then
  log "Backup: $BACKUP_FILE"
else
  log "Backup: (omitido)"
fi
