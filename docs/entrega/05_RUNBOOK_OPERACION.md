# Runbook de operación y soporte
## Plataforma Hospital Santa Fe

**Versión:** 2.0 · **Septiembre 2026**  
**Audiencia:** TI del hospital (N1/N2)  
**Despliegue de referencia:** on‑premise Linux (QA/Prod). Guía ampliada de instalación: [14_DESPLIEGUE_PROD_RESUMEN.md](./14_DESPLIEGUE_PROD_RESUMEN.md) · [13_DESPLIEGUE_ONPREM_QA_PROD.md](./13_DESPLIEGUE_ONPREM_QA_PROD.md)

---

## 1. Arquitectura operativa

```text
Navegador → nginx:443 → Next.js:3000 → /api/* → NestJS:8000 → PostgreSQL:5432 (localhost)
                                                      ↘ /var/lib/hospitalsantafe/preadmissions
```

| Servicio | Tecnología | Unidad systemd | Puerto |
|----------|------------|----------------|--------|
| Frontend | Next.js | `hospitalsantafe-web` | 3000 |
| Backend API | NestJS | `hospitalsantafe-api` | 8000 |
| Base de datos | PostgreSQL | `postgresql` | 5432 (solo localhost) |
| Proxy / TLS | nginx | `nginx` | 80 / 443 |
| Adjuntos | Disco | — | `PREADMISSION_UPLOAD_DIR` |

| Ruta / recurso | Valor típico |
|----------------|--------------|
| Código | `/opt/hospitalsantafe` |
| Usuario de aplicación | `hospitalsantafe` |
| Admin SSH (prod) | `prodpreadinex` (con sudo) |
| Adjuntos | `/var/lib/hospitalsantafe/preadmissions` |
| `.env` | `/opt/hospitalsantafe/.env` **y** copia `backend/.env` |
| Backups | `/var/backups/` |

El frontend proxya `/api/*` hacia el backend vía `API_URL` (en prod: `http://127.0.0.1:8000`).

**Zona horaria:** Panamá (`America/Panama`). El script de deploy escribe drop‑in systemd `TZ=America/Panama`. Verificar: `timedatectl`.

---

## 2. Variables de entorno críticas

Plantilla completa: `.env.example` en la raíz del repositorio.

### Backend (obligatorias en producción)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL (usuario app, no `postgres`) |
| `DATABASE_SSL` | `false` en on‑prem local |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Secreto ≥ 32 caracteres (distinto por entorno) |
| `FRONTEND_URL` | URL pública HTTPS (CORS) |
| `APP_BASE_URL` | Misma URL pública (enlaces de correo / reset) |
| `API_URL` | Backend interno, p. ej. `http://127.0.0.1:8000` |

### Backend (operación)

| Variable | Descripción |
|----------|-------------|
| `PREADMISSION_UPLOAD_DIR` | Raíz adjuntos (volumen persistente) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Correo saliente |
| `CELLBYTE_*` | Integración preadmisión (si aplica) |
| `OPS_API_SERVICE` | Opcional; default `hospitalsantafe-api` |
| `OPS_WEB_SERVICE` | Opcional; default `hospitalsantafe-web` |
| `OPS_DB_SERVICE` | Opcional; default `postgresql` |

### Reglas importantes

- **No** poner `PORT=` en el `.env`: el puerto lo define **systemd** (`Environment=PORT=8000` / `3000`).
- Tras editar `.env`: `sudo cp /opt/hospitalsantafe/.env /opt/hospitalsantafe/backend/.env` y reiniciar servicios.
- Permisos: `chmod 600` en ambos `.env`; dueño `hospitalsantafe`.

---

## 3. Instalación inicial (resumen)

> Detalle paso a paso: documentos 13 y 14. Aquí el checklist de comandos.

```bash
# SSH como admin TI (ej. prod)
ssh prodpreadinex@<IP-o-hostname>

# Paquetes base
sudo apt update
sudo apt install -y nginx git curl build-essential postgresql postgresql-client
node -v && npm -v   # Node 20 LTS recomendado

# Usuario y directorios
sudo useradd -r -m -d /opt/hospitalsantafe -s /bin/bash hospitalsantafe 2>/dev/null || true
sudo mkdir -p /opt/hospitalsantafe /var/lib/hospitalsantafe/preadmissions /var/backups
sudo chown -R hospitalsantafe:hospitalsantafe /opt/hospitalsantafe /var/lib/hospitalsantafe
sudo chmod 750 /var/lib/hospitalsantafe/preadmissions
```

### 3.1 PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER hospital_app WITH PASSWORD 'PASSWORD_FUERTE';
CREATE DATABASE hospital_santa_fe OWNER hospital_app;
GRANT ALL PRIVILEGES ON DATABASE hospital_santa_fe TO hospital_app;
\q
```

```bash
psql "postgresql://hospital_app:PASSWORD@localhost:5432/hospital_santa_fe" -c "SELECT 1;"
```

### 3.2 Código, env y build

```bash
cd /opt/hospitalsantafe
sudo git clone <URL-REPO> .
sudo git checkout main
sudo chown -R hospitalsantafe:hospitalsantafe /opt/hospitalsantafe

sudo -u hospitalsantafe cp .env.example .env
sudo -u hospitalsantafe nano .env   # completar (ver §2)
sudo cp .env backend/.env
sudo chown hospitalsantafe:hospitalsantafe .env backend/.env
sudo chmod 600 .env backend/.env

sudo -u hospitalsantafe -i
cd /opt/hospitalsantafe
npm ci
npm run backend:build
npm run build
exit
```

### 3.3 Schema y catálogos

```bash
cd /opt/hospitalsantafe
sudo -u hospitalsantafe bash -c 'set -a && source .env && set +a && npm run backend:sync'
sudo -u hospitalsantafe bash -c 'set -a && source .env && set +a && npm run backend:init'
# backend:init: usuarios demo, servicios, nacionalidades, catálogo geo

export DATABASE_URL="postgresql://hospital_app:PASSWORD@localhost:5432/hospital_santa_fe"
for f in db/migrations/*.sql; do
  echo "=== $f ==="
  psql "$DATABASE_URL" -f "$f"
done
psql "$DATABASE_URL" -f db/validacion_geo_catalogo.sql
```

### 3.4 Systemd (unidades mínimas)

Crear `/etc/systemd/system/hospitalsantafe-api.service` y `hospitalsantafe-web.service` (plantillas en doc 14). Luego:

```bash
# Zona horaria del proceso (también lo aplica deploy-onprem.sh)
sudo mkdir -p /etc/systemd/system/hospitalsantafe-api.service.d
sudo mkdir -p /etc/systemd/system/hospitalsantafe-web.service.d
echo -e '[Service]\nEnvironment=TZ=America/Panama' | sudo tee \
  /etc/systemd/system/hospitalsantafe-api.service.d/timezone.conf \
  /etc/systemd/system/hospitalsantafe-web.service.d/timezone.conf

sudo systemctl daemon-reload
sudo systemctl enable hospitalsantafe-api hospitalsantafe-web
sudo systemctl start hospitalsantafe-api
sleep 2
sudo systemctl start hospitalsantafe-web
```

### 3.5 Nginx + HTTPS

- Proxy a `127.0.0.1:3000`
- `client_max_body_size 100M;` (adjuntos hasta 15 MB; videos monitor hasta 80 MB)
- Certificado institucional; `FRONTEND_URL` / `APP_BASE_URL` = URL del navegador
- Cámara QR del paciente exige **HTTPS**

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 3.6 Smoke test post‑instalación

```bash
curl -s http://127.0.0.1:8000/api/health
curl -s http://127.0.0.1:8000/api/health/cellbyte
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
ss -tlnp | grep -E ':3000|:8000|:5432'
```

Checklist funcional:

- [ ] Portal HTTPS carga
- [ ] Login staff; **cambiar contraseñas demo**
- [ ] Preadmisión + adjunto visible en disco bajo `PREADMISSION_UPLOAD_DIR`
- [ ] Escaneo QR con cámara (HTTPS)
- [ ] Correo SMTP (verificación / confirmación)
- [ ] Cellbyte connectivity (si aplica)
- [ ] `/admin/ops` visible con permiso `view_ops`
- [ ] Bitácora `/admin/audit` con permiso `view_audit`

---

## 4. Actualización (deploy habitual)

Preferido — script oficial:

```bash
sudo bash /opt/hospitalsantafe/scripts/deploy-onprem.sh
```

Variables opcionales:

| Variable | Efecto |
|----------|--------|
| `SKIP_GIT_PULL=1` | No hace `git fetch/reset` |
| `SKIP_NPM_CI=1` | Omite `npm ci` (más rápido si no cambió `package-lock`) |
| `SKIP_GEO_SQL=1` | Omite SQL de catálogo geo |
| `GIT_BRANCH=main` | Rama a desplegar |

El script: sincroniza git → `npm ci` → `backend:build` → `build` → aplica geo SQL → reinicia API/Web → comprueba health.

### Manual (si no usa el script)

```bash
cd /opt/hospitalsantafe
sudo -u hospitalsantafe bash -lc 'git fetch origin main && git reset --hard origin/main && git clean -fd'
sudo -u hospitalsantafe bash -lc 'cd /opt/hospitalsantafe && npm ci && npm run backend:build && npm run build'
sudo systemctl restart hospitalsantafe-api hospitalsantafe-web
curl -sf http://127.0.0.1:8000/api/health && echo OK
```

> **Memoria en build:** `npm ci` / `next build` pueden consumir varios GB. Si el servidor se cuelga, detenga `hospitalsantafe-web` antes del build, aumente swap, o compile en otra máquina y copie `.next` + `backend/dist`.

---

## 5. Comandos diarios de servicios

```bash
# Estado
sudo systemctl status hospitalsantafe-api hospitalsantafe-web nginx postgresql --no-pager

# Reinicio
sudo systemctl restart hospitalsantafe-api
sudo systemctl restart hospitalsantafe-web
sudo systemctl restart hospitalsantafe-api hospitalsantafe-web

# Parar / arrancar (mantenimiento)
sudo systemctl stop hospitalsantafe-web hospitalsantafe-api
sudo systemctl start hospitalsantafe-api
sleep 2
sudo systemctl start hospitalsantafe-web

# Si un restart se queda colgado (OOM / npm)
sudo systemctl kill -s SIGKILL hospitalsantafe-web
sudo systemctl reset-failed hospitalsantafe-web
sudo systemctl start hospitalsantafe-web

# Logs en vivo
sudo journalctl -u hospitalsantafe-api -f
sudo journalctl -u hospitalsantafe-web -f

# Últimas líneas
sudo journalctl -u hospitalsantafe-api -n 80 --no-pager
sudo journalctl -u hospitalsantafe-web -n 80 --no-pager

# Recursos
free -h
df -h / /var/lib/hospitalsantafe /opt/hospitalsantafe
ps aux --sort=-%mem | head -20
```

Al arrancar el API debe aparecer en log algo como:

```text
Adjuntos de preadmisión: /var/lib/hospitalsantafe/preadmissions
```

---

## 6. Backup y recuperación ante fallos

### 6.1 Qué respaldar

| Activo | Ruta / recurso | Frecuencia sugerida |
|--------|----------------|---------------------|
| Base de datos | PostgreSQL `hospital_santa_fe` | Diario |
| Adjuntos | `/var/lib/hospitalsantafe/preadmissions` | Diario o semanal |
| Config | `/opt/hospitalsantafe/.env` (fuera de git, acceso restringido) | Tras cada cambio |
| Certificados nginx | Rutas TI | Según política TI |

**Sin adjuntos**, la BD puede tener rutas válidas pero Cellbyte recibe `cedulaimagen` vacío.

### 6.2 Backup manual

```bash
sudo mkdir -p /var/backups
sudo chmod 700 /var/backups

# PostgreSQL (custom format)
export DATABASE_URL="postgresql://hospital_app:PASSWORD@localhost:5432/hospital_santa_fe"
pg_dump "$DATABASE_URL" -Fc -f /var/backups/hospital_$(date +%Y%m%d).dump

# Adjuntos
sudo tar czf /var/backups/hospital_preadmissions_$(date +%Y%m%d).tar.gz \
  -C /var/lib/hospitalsantafe preadmissions

# Retención ejemplo: borrar dumps > 14 días
find /var/backups -name 'hospital_*.dump' -mtime +14 -delete
```

### 6.3 Cron de backups (root)

```bash
sudo crontab -e
```

```cron
# PostgreSQL diario 02:00 (hora del servidor; preferir America/Panama)
0 2 * * * pg_dump "postgresql://hospital_app:PASSWORD@localhost:5432/hospital_santa_fe" -Fc -f /var/backups/hospital_$(date +\%Y\%m\%d).dump

# Adjuntos semanal domingo 03:00
0 3 * * 0 tar czf /var/backups/hospital_preadmissions_$(date +\%Y\%m\%d).tar.gz -C /var/lib/hospitalsantafe preadmissions
```

### 6.4 Restaurar PostgreSQL

```bash
# Preferible en ventana de mantenimiento
sudo systemctl stop hospitalsantafe-web hospitalsantafe-api

# Opción A — restaurar sobre BD existente (cuidado: --clean borra objetos)
pg_restore -d "postgresql://hospital_app:PASSWORD@localhost:5432/hospital_santa_fe" \
  --clean --if-exists /var/backups/hospital_YYYYMMDD.dump

# Opción B — BD nueva
# createdb -O hospital_app hospital_santa_fe_restored
# pg_restore -d ... hospital_YYYYMMDD.dump

sudo systemctl start hospitalsantafe-api
sleep 2
sudo systemctl start hospitalsantafe-web
curl -sf http://127.0.0.1:8000/api/health
```

### 6.5 Restaurar adjuntos

```bash
sudo systemctl stop hospitalsantafe-api   # opcional, evita escrituras concurrentes
sudo tar xzf /var/backups/hospital_preadmissions_YYYYMMDD.tar.gz -C /var/lib/hospitalsantafe
sudo chown -R hospitalsantafe:hospitalsantafe /var/lib/hospitalsantafe/preadmissions
sudo systemctl start hospitalsantafe-api
```

### 6.6 Contingencia operativa (caída prolongada)

1. Confirmar alcance: solo Web, solo API, Postgres, red, nginx.
2. Escalamiento §10; TI restaura backup o reinicia host.
3. Mientras tanto: **modo manual** (turnos en papel / protocolo clínico del hospital).
4. Tras recuperación: checklist §11.

RTO/RPO dependen de la frecuencia de backup y del hardware del hospital (no los fija el software solo).

---

## 7. Monitoreo

### 7.1 Monitor operativo (UI)

- URL: `/admin/ops`
- Permiso: `view_ops` (matriz en `/admin/permissions`)
- Poll cada **15 s**
- Muestra: RAM host, load, disco, estado systemd, RSS de Next/API, latencia BD, alertas

### 7.2 API de ops (JWT + permiso)

```bash
# Sustituya TOKEN por un JWT de usuario con view_ops
curl -s -H "Authorization: Bearer TOKEN" https://<HOST>/api/ops/status | jq .
# o en el servidor:
curl -s -H "Authorization: Bearer TOKEN" http://127.0.0.1:8000/api/ops/status
```

Umbrales orientativos (alertas en UI):

| Métrica | Warn | Critical |
|---------|------|----------|
| RSS Next.js | ≥ ~1 GB | ≥ ~1.5 GB |
| Servicio systemd down | — | critical |
| Latencia / fallo de checks | timeouts cortos (~1.5–2.5 s) para no agravar picos | |

### 7.3 Health públicos (sin auth)

```bash
curl -s http://127.0.0.1:8000/api/health
curl -s http://127.0.0.1:8000/api/health/cellbyte
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "%{http_code}\n" https://<HOST>/
```

### 7.4 Bitácora de auditoría

- UI: `/admin/audit` (`view_audit`)
- Export Excel desde la misma pantalla (permiso export si aplica)
- Tras actualizar permisos: «Aplicar recomendados» para roles supervisor/auditor

### 7.5 Reinicio programado (memoria de Next.js)

Next.js puede crecer en RSS durante el día. Cron de **root** (servidor en `America/Panama`):

```bash
sudo crontab -e
# Verificar: sudo crontab -l && timedatectl
```

```cron
# 01:00 — API + Web
0 1 * * * /usr/bin/systemctl restart hospitalsantafe-web hospitalsantafe-api >> /var/log/hsf-nightly-restart.log 2>&1

# 12:00 — solo Web (corta crecimiento diurno de next-server)
0 12 * * * /usr/bin/systemctl restart hospitalsantafe-web >> /var/log/hsf-nightly-restart.log 2>&1
```

```bash
sudo touch /var/log/hsf-nightly-restart.log
sudo chmod 644 /var/log/hsf-nightly-restart.log
tail -n 50 /var/log/hsf-nightly-restart.log
```

### 7.6 Comportamiento operativo reciente (turnos)

- Cola Staff / API de tickets (roles operativos): solo **día calendario Panamá**.
- Monitor: solo llamados del **día actual**.
- Turnos **Llamado / En atención** de días anteriores se liberan solos (`no_show` + nota) al consultar monitor/staff.
- Radiología / Toma de muestra: cola Staff filtrada a transferidos; multi‑llamado permitido.

---

## 8. Integración Cellbyte

```bash
curl -s http://127.0.0.1:8000/api/health/cellbyte
# Con JWT + permiso review_preadmissions:
# GET /api/integrations/cellbyte/connectivity
```

```sql
SELECT id, "preadmissionId", success, "errorMessage", attempt, "createdAt"
FROM integration_logs
WHERE integration = 'cellbyte'
ORDER BY "createdAt" DESC
LIMIT 20;
```

| Síntoma | Acción |
|---------|--------|
| `skipped` | Falta `CELLBYTE_BASE_URL` |
| Timeout / ECONNREFUSED | Red/firewall hacia IP Cellbyte |
| HTTP 401 | `CELLBYTE_USERNAME` / `CELLBYTE_PASSWORD` |
| Imagen vacía | Adjunto faltante en disco (§9 Adjunto 404) |

La preadmisión **no debe bloquearse** si Cellbyte cae: hay bitácora y reintentos.

---

## 9. Incidentes frecuentes

### 502 Bad Gateway / portal caído

```bash
sudo systemctl status hospitalsantafe-web nginx --no-pager
sudo journalctl -u hospitalsantafe-web -n 50 --no-pager
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
sudo systemctl restart hospitalsantafe-web
```

### API no responde / health fallido

```bash
sudo journalctl -u hospitalsantafe-api -n 80 --no-pager
curl -s http://127.0.0.1:8000/api/health
# Schema geo / TypeORM:
sudo -u hospitalsantafe bash -lc 'cd /opt/hospitalsantafe && npm run backend:apply-geo-sql'
# Confirmar DATABASE_SSL=false on-prem
sudo systemctl restart hospitalsantafe-api
```

### 401 Unauthorized (staff)

| Causa | Solución |
|-------|----------|
| JWT expirado (~30 min) | Volver a iniciar sesión |
| Sin `Authorization: Bearer` | Revisar cliente / proxy |
| Sin permiso | `/admin/permissions` |

### CORS / API desde el navegador

| Causa | Solución |
|-------|----------|
| `FRONTEND_URL` ≠ URL del navegador | Igualar HTTPS público |
| `API_URL` incorrecta | `http://127.0.0.1:8000` en servidor |

### Adjunto 404

```bash
ls -la /var/lib/hospitalsantafe/preadmissions/
sudo chown -R hospitalsantafe:hospitalsantafe /var/lib/hospitalsantafe/preadmissions
# Verificar PREADMISSION_UPLOAD_DIR en .env y log de arranque del API
```

### Correos no llegan

1. `SMTP_*` y `NODE_ENV=production`
2. Google Workspace: **contraseña de aplicación**
3. Guía: `docs/GUIA_SMTP_GOOGLE_WORKSPACE.md`
4. Revisar spam; `APP_BASE_URL` correcto para enlaces de reset

### Disco lleno / adjuntos

```bash
df -h
du -sh /var/lib/hospitalsantafe/preadmissions /var/backups /opt/hospitalsantafe
# Purgar backups antiguos; no borrar preadmissions sin política
```

### Build / deploy se cuelga por RAM

```bash
sudo systemctl stop hospitalsantafe-web
free -h
# Reintentar deploy; o SKIP_NPM_CI=1 si node_modules ya está
sudo bash /opt/hospitalsantafe/scripts/deploy-onprem.sh
```

### Catálogo geo desfasado

```bash
cd /opt/hospitalsantafe
sudo -u hospitalsantafe bash -c 'set -a && source .env && set +a && npm run backend:sync-geo'
psql "$DATABASE_URL" -f db/validacion_geo_catalogo.sql
```

### Archivos adjuntos rechazados (corruptos / formato)

El API valida firma real (magic bytes) PNG/JPG/PDF, rechaza vacíos y MIME incoherente. Mensaje al usuario; no requiere acción de TI salvo revisar logs si hay falso positivo masivo.

---

## 10. Escalamiento

| Nivel | Responsable | Acciones |
|-------|-------------|----------|
| N1 | Recepción / mesa de ayuda | Reinicio navegador, re‑login, verificar Wi‑Fi/VPN del puesto |
| N2 | TI hospital | Servicios systemd, `.env`, nginx, Postgres, backups, SMTP, volumen adjuntos, `/admin/ops` |
| N3 | Proveedor desarrollo | Defectos de código, Cellbyte, parches, features |

Canales y SLAs: según contrato / `RESPUESTA_ACLARACIONES.md`.

---

## 11. Checklist post‑incidente

- [ ] Causa raíz documentada (servicio, hora, logs)
- [ ] Backup reciente verificado o restaurado
- [ ] Variables `.env` / `backend/.env` alineadas
- [ ] `systemctl status` API + Web + nginx + postgresql OK
- [ ] Smoke: `GET /api/health`, login staff, una preadmisión de prueba, adjunto en disco
- [ ] Cellbyte connectivity OK (si aplica)
- [ ] `/admin/ops` sin alertas críticas persistentes
- [ ] Comunicar a operación que pueden retomar flujo digital

---

## 12. Referencia rápida de scripts npm

Ejecutar como `hospitalsantafe` desde `/opt/hospitalsantafe` con `.env` cargado:

| Script | Uso |
|--------|-----|
| `npm ci` | Instalar dependencias (CI/prod) |
| `npm run backend:build` | Compilar Nest → `backend/dist` |
| `npm run build` | Compilar Next → `.next` |
| `npm run backend:sync` | Sincronizar schema TypeORM |
| `npm run backend:init` | Datos iniciales + geo |
| `npm run backend:apply-geo-sql` | SQL geo Cellbyte (antes de arrancar API si falla schema) |
| `npm run backend:sync-geo` | Resincronizar catálogo geo |
| `sudo bash scripts/deploy-onprem.sh` | Actualización completa on‑prem |

---

## 13. Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [14_DESPLIEGUE_PROD_RESUMEN.md](./14_DESPLIEGUE_PROD_RESUMEN.md) | Instalación prod condensada |
| [13_DESPLIEGUE_ONPREM_QA_PROD.md](./13_DESPLIEGUE_ONPREM_QA_PROD.md) | QA/Prod detallada + nginx |
| [06_GUIA_INTEGRACION_CELLBYTE.md](./06_GUIA_INTEGRACION_CELLBYTE.md) | Cellbyte |
| [11_INVENTARIO_SECRETOS.md](./11_INVENTARIO_SECRETOS.md) | Secretos y rotación |
| [03_MANUAL_ADMINISTRADOR.md](./03_MANUAL_ADMINISTRADOR.md) | Admin funcional |
| `docs/GUIA_SMTP_GOOGLE_WORKSPACE.md` | Correo |
| `RESPUESTA_ACLARACIONES.md` | SLA, backups, responsabilidades |

---

*Documento de entrega — Hospital Santa Fe Panamá · Runbook TI v2.0*
