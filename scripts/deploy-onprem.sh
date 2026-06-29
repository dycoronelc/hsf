#!/usr/bin/env bash
#
# Despliegue / actualización on-prem — Hospital Santa Fe
#
# Uso (como usuario con sudo, p. ej. qapread o prodpreadinex):
#   sudo bash /opt/hospitalsantafe/scripts/deploy-onprem.sh
#
# O desde el repo tras git pull local:
#   cd /opt/hospitalsantafe && sudo bash scripts/deploy-onprem.sh
#
# Variables opcionales:
#   APP_DIR=/opt/hospitalsantafe
#   APP_USER=hospitalsantafe
#   GIT_BRANCH=main
#   SKIP_NPM_CI=1          # omitir npm ci
#   SKIP_GIT_PULL=1        # omitir git pull
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hospitalsantafe}"
APP_USER="${APP_USER:-hospitalsantafe}"
GIT_BRANCH="${GIT_BRANCH:-main}"
API_SERVICE="${API_SERVICE:-hospitalsantafe-api}"
WEB_SERVICE="${WEB_SERVICE:-hospitalsantafe-web}"

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

if [[ ! -d "$APP_DIR" ]]; then
  die "No existe APP_DIR=$APP_DIR"
fi

if ! id "$APP_USER" &>/dev/null; then
  die "Usuario de aplicación no encontrado: $APP_USER"
fi

if [[ "$(id -u)" -ne 0 ]]; then
  die "Ejecute con sudo: sudo bash $0"
fi

run_app() {
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && $*"
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local max_attempts="${3:-30}"
  local sleep_sec="${4:-2}"
  local attempt=1

  while [[ "$attempt" -le "$max_attempts" ]]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "$label OK ($url)"
      return 0
    fi
    if [[ "$attempt" -lt "$max_attempts" ]]; then
      log "Esperando $label... ($attempt/$max_attempts)"
      sleep "$sleep_sec"
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

wait_for_http_code() {
  local url="$1"
  local expected="$2"
  local label="$3"
  local max_attempts="${4:-30}"
  local sleep_sec="${5:-2}"
  local attempt=1
  local code=""

  while [[ "$attempt" -le "$max_attempts" ]]; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || true)"
    if [[ "$code" == "$expected" ]]; then
      log "$label OK ($url) HTTP $code"
      return 0
    fi
    if [[ "$attempt" -lt "$max_attempts" ]]; then
      log "Esperando $label... ($attempt/$max_attempts, HTTP ${code:-sin respuesta})"
      sleep "$sleep_sec"
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

log "Directorio: $APP_DIR | Usuario app: $APP_USER | Rama: $GIT_BRANCH"

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
  log "git pull origin $GIT_BRANCH ..."
  run_app "git pull origin '$GIT_BRANCH'"
else
  log "Omitiendo git pull (SKIP_GIT_PULL=1)"
fi

if [[ "${SKIP_NPM_CI:-0}" != "1" ]]; then
  log "npm ci ..."
  run_app "npm ci"
else
  log "Omitiendo npm ci (SKIP_NPM_CI=1)"
fi

log "npm run backend:build ..."
run_app "npm run backend:build"

log "npm run build ..."
run_app "npm run build"

log "Ajustando permisos ..."
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

log "Reiniciando servicios systemd ..."
systemctl daemon-reload
systemctl restart "$API_SERVICE"
systemctl restart "$WEB_SERVICE"

log "Estado de servicios:"
systemctl --no-pager --full status "$API_SERVICE" "$WEB_SERVICE" || true

log "Comprobaciones locales (con reintentos) ..."
if ! wait_for_http "http://127.0.0.1:8000/api/health" "API health" 30 2; then
  die "API no responde en http://127.0.0.1:8000/api/health — revise: journalctl -u $API_SERVICE -n 50"
fi

if ! wait_for_http_code "http://127.0.0.1:3000/" "200" "Web" 30 2; then
  die "Web no responde 200 en :3000 — revise: journalctl -u $WEB_SERVICE -n 50"
fi

log "Despliegue completado."
