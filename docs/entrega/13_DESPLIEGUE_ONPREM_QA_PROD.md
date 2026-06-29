# Despliegue on‑premise — QA y Producción
## Hospital Santa Fe — Guía paso a paso

**Versión:** 1.0 · Mayo 2026  
**Objetivo:** Desplegar la plataforma en los servidores del cliente y **dejar de usar Railway**.

---

## 0. Resumen de arquitectura en cada servidor

Cada servidor (QA y Prod) corre **todo en la misma máquina**:

| Componente | Puerto interno | Notas |
|------------|----------------|-------|
| PostgreSQL 15 | 5432 | Datos en `/var/lib/postgresql` (disco `sdb`) |
| Backend NestJS | 8000 | Solo localhost |
| Frontend Next.js | 3000 | Solo localhost |
| Nginx | 443 | HTTPS público → proxy a :3000 |
| Adjuntos | — | `/var/lib/hospitalsantafe/preadmissions` |

El navegador **no** habla directo con el backend: Next.js reenvía `/api/*` usando `API_URL=http://127.0.0.1:8000`.

```text
Internet → nginx:443 → Next.js:3000 → /api/* → NestJS:8000 → PostgreSQL
                                              ↘ adjuntos en disco
```

---

## 1. Servidores (según entorno del cliente)

| Entorno | Usuario SSH | Host | PostgreSQL |
|---------|-------------|------|------------|
| **QA** | `qapread` | `qapread` (o IP/FQDN que indique TI) | 15.18, disco dedicado |
| **Producción** | `prodpreadinex` | `prodpreadhsf` (o IP/FQDN) | 15.18, disco dedicado |

**Stack ya verificado en ambos:** Node 20, Git, pnpm (el proyecto usa **npm** — ver paso 4).

---

## 2. Antes de empezar (desde su PC)

### 2.1 Acceso SSH

```bash
# QA
ssh qapread@<IP-o-hostname-qa>

# Producción
ssh prodpreadinex@<IP-o-hostname-prod>
```

Use clave SSH (recomendado) o la contraseña que entregue TI.

### 2.2 Información que debe pedir a TI del hospital

- [ ] IP o hostname final y DNS (ej. `qa-pread.hospital.local`, `pread.hospital.com`)
- [ ] Certificado TLS (`.crt` + `.key`) o uso de Let's Encrypt interno
- [ ] Acceso **sudo** en el servidor
- [ ] URL/credenciales **Cellbyte** (UAT en QA, prod en Prod)
- [ ] Cuenta **SMTP** (Google Workspace)
- [ ] Si el repo GitHub es privado: deploy key o token para `git clone`

### 2.3 Orden recomendado

1. Desplegar y probar **QA** completo  
2. Migrar datos de prueba si hace falta  
3. Desplegar **Producción**  
4. Cambiar DNS / comunicar URL nueva  
5. Apagar servicios **Railway** (frontend, backend, Postgres)

---

## 3. Preparación del servidor (QA y Prod — repetir en cada uno)

Conéctese por SSH y ejecute:

### 3.1 Paquetes base

```bash
sudo apt update
sudo apt install -y nginx git curl build-essential
```

Node 20 ya está instalado. Confirme rutas:

```bash
node -v    # debe ser v20.x
npm -v
which node
which npm
```

Si `npm` no existe:

```bash
sudo apt install -y npm
# o: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
```

### 3.2 Usuario de aplicación (recomendado)

```bash
sudo useradd -r -m -d /opt/hospitalsantafe -s /bin/bash hospitalsantafe || true
sudo mkdir -p /opt/hospitalsantafe
sudo chown hospitalsantafe:hospitalsantafe /opt/hospitalsantafe
```

*(Si TI prefiere desplegar con `qapread` / `prodpreadinex`, omita este usuario y use su home; ajuste rutas.)*

### 3.3 Carpetas persistentes

```bash
# Adjuntos de preadmisión (OBLIGATORIO — no usar disco efímero)
sudo mkdir -p /var/lib/hospitalsantafe/preadmissions
sudo chown hospitalsantafe:hospitalsantafe /var/lib/hospitalsantafe/preadmissions
sudo chmod 750 /var/lib/hospitalsantafe/preadmissions
```

### 3.4 PostgreSQL — base de datos

Entre al shell de Postgres:

```bash
sudo -u postgres psql
```

**En QA**, ejecute (cambie la contraseña):

```sql
CREATE USER hospital_app_qa WITH PASSWORD 'CAMBIAR_PASSWORD_QA_FUERTE';
CREATE DATABASE hospital_santa_fe_qa OWNER hospital_app_qa;
GRANT ALL PRIVILEGES ON DATABASE hospital_santa_fe_qa TO hospital_app_qa;
\q
```

**En Producción**, use nombres distintos:

```sql
CREATE USER hospital_app WITH PASSWORD 'CAMBIAR_PASSWORD_PROD_FUERTE';
CREATE DATABASE hospital_santa_fe OWNER hospital_app;
GRANT ALL PRIVILEGES ON DATABASE hospital_santa_fe TO hospital_app;
\q
```

Prueba conexión:

```bash
psql "postgresql://hospital_app_qa:CAMBIAR_PASSWORD_QA_FUERTE@localhost:5432/hospital_santa_fe_qa" -c "SELECT 1;"
```

---

## 4. Clonar el proyecto

Como usuario de despliegue (`hospitalsantafe` o su usuario):

```bash
sudo -u hospitalsantafe -i
cd /opt/hospitalsantafe
```

Clone el repositorio (ajuste URL y rama):

```bash
git clone https://github.com/dycoronelc/hsf.git .
git checkout main
git pull
```

Si el repo es privado, configure deploy key en GitHub o:

```bash
git clone git@github.com:dycoronelc/hsf.git .
```

---

## 5. Variables de entorno (`.env`)

### 5.1 Crear archivo

```bash
cd /opt/hospitalsantafe
cp .env.example .env
chmod 600 .env
cp .env backend/.env
```

### 5.2 QA — ejemplo `.env`

Edite con `nano .env`:

```bash
DATABASE_URL=postgresql://hospital_app_qa:CAMBIAR_PASSWORD_QA_FUERTE@localhost:5432/hospital_santa_fe_qa
DATABASE_SSL=false
NODE_ENV=production
PORT=8000

FRONTEND_URL=https://qa-pread.hospitalsantafepanama.com
APP_BASE_URL=https://qa-pread.hospitalsantafepanama.com

API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

JWT_SECRET=GENERAR_CADENA_ALEATORIA_MIN_32_CHARS_QA

PREADMISSION_UPLOAD_DIR=/var/lib/hospitalsantafe/preadmissions

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@hospitalsantafepanama.com
SMTP_PASS=CONTRASEÑA_APLICACION_GOOGLE
SMTP_FROM="Hospital Santa Fe QA <correo@hospitalsantafepanama.com>"

CELLBYTE_BASE_URL=http://192.168.30.41:8080/cbUat
CELLBYTE_USERNAME=usuario_uat
CELLBYTE_PASSWORD=password_uat
```

Generar `JWT_SECRET`:

```bash
openssl rand -base64 48
```

### 5.3 Producción — ejemplo `.env`

Igual estructura, con **valores distintos**:

- `DATABASE_URL` → `hospital_santa_fe` + usuario `hospital_app`
- `FRONTEND_URL` / `APP_BASE_URL` → URL pública real de producción
- `JWT_SECRET` → **otro** distinto al de QA
- `SMTP_FROM` → sin "QA" en el nombre
- `CELLBYTE_*` → credenciales **producción** Cellbyte

```bash
cp .env backend/.env
chmod 600 backend/.env
```

---

## 6. Instalar dependencias y compilar

```bash
cd /opt/hospitalsantafe
npm ci
npm run backend:build
npm run build
```

Si `npm ci` falla por lock desactualizado:

```bash
npm install
npm run backend:build
npm run build
```

Tiempo estimado: 5–15 minutos según CPU/red.

---

## 7. Base de datos — tablas, catálogos y migraciones

### 7.1 Crear tablas (TypeORM synchronize)

```bash
cd /opt/hospitalsantafe
npm run backend:sync
```

### 7.2 Datos iniciales (usuarios demo, catálogos, geo TE)

**Solo la primera vez** en cada entorno:

```bash
npm run backend:init
```

`backend:init` carga nacionalidades desde CSV y el **catálogo geográfico completo** desde `db/datosgeograficos_postgres.sql` + migraciones geo (no depende solo de `ubicacion_geo.csv`). Para re-sincronizar geo en un entorno existente: `npm run backend:sync-geo`.

Usuarios creados si no existen:

| Email | Contraseña inicial |
|-------|-------------------|
| admin@hospitalsantafe.com | admin123 |
| reception@hospitalsantafe.com | reception123 |

**En producción:** cambie estas contraseñas inmediatamente después del smoke test.

### 7.3 Migraciones SQL adicionales

Ejecute en orden (si aún no corrieron):

```bash
cd /opt/hospitalsantafe
for f in db/migrations/*.sql; do
  echo "=== $f ==="
  psql "$DATABASE_URL" -f "$f"
done
```

O una a una con el usuario de la BD:

```bash
export DATABASE_URL="postgresql://hospital_app_qa:...@localhost:5432/hospital_santa_fe_qa"
psql "$DATABASE_URL" -f db/migrations/20260513_drop_legacy_appointments.sql
psql "$DATABASE_URL" -f db/migrations/20260514_admin_role_matrix_rows.sql
psql "$DATABASE_URL" -f db/migrations/20260525_geo_catalog_gaps.sql
psql "$DATABASE_URL" -f db/migrations/20260525_preadmission_attachment_paths.sql
psql "$DATABASE_URL" -f db/migrations/20260526_sync_geo_from_referencia.sql
psql "$DATABASE_URL" -f db/migrations/20260527_preadmission_host_and_cellbyte.sql
```

---

## 8. Servicios systemd

Salga del usuario hospitalsantafe si usó `sudo -u hospitalsantafe -i` (`exit`) y cree units como root.

### 8.1 API (backend)

```bash
sudo nano /etc/systemd/system/hospitalsantafe-api.service
```

Contenido (ajuste `User` y rutas de `node` si difieren — use `which node`):

```ini
[Unit]
Description=Hospital Santa Fe API (NestJS)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=hospitalsantafe
Group=hospitalsantafe
WorkingDirectory=/opt/hospitalsantafe/backend
EnvironmentFile=/opt/hospitalsantafe/.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 8.2 Frontend (Next.js)

```bash
sudo nano /etc/systemd/system/hospitalsantafe-web.service
```

```ini
[Unit]
Description=Hospital Santa Fe Web (Next.js)
After=network.target hospitalsantafe-api.service
Wants=hospitalsantafe-api.service

[Service]
Type=simple
User=hospitalsantafe
Group=hospitalsantafe
WorkingDirectory=/opt/hospitalsantafe
EnvironmentFile=/opt/hospitalsantafe/.env
Environment=PORT=3000
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 8.3 Activar servicios

```bash
sudo systemctl daemon-reload
sudo systemctl enable hospitalsantafe-api hospitalsantafe-web
sudo systemctl start hospitalsantafe-api
sudo systemctl start hospitalsantafe-web
sudo systemctl status hospitalsantafe-api hospitalsantafe-web
```

Logs:

```bash
sudo journalctl -u hospitalsantafe-api -f
sudo journalctl -u hospitalsantafe-web -f
```

Prueba local en el servidor:

```bash
curl -s http://127.0.0.1:8000/api/health
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/
```

---

## 9. Nginx (HTTPS público)

### 9.1 Configuración

```bash
sudo nano /etc/nginx/sites-available/hospitalsantafe
```

**QA** (cambie `server_name`):

```nginx
server {
    listen 80;
    server_name qa-pread.hospitalsantafepanama.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name qa-pread.hospitalsantafepanama.com;

    ssl_certificate     /etc/ssl/certs/hospital-qa.crt;
    ssl_certificate_key /etc/ssl/private/hospital-qa.key;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

Active el sitio:

```bash
sudo ln -sf /etc/nginx/sites-available/hospitalsantafe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Repita en **Producción** con certificado y `server_name` de prod.

---

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

PostgreSQL **no** debe estar expuesto a Internet (`5432` solo localhost).

---

## 11. Smoke test (checklist)

Desde un navegador apuntando al DNS del servidor:

- [ ] `https://<su-dominio>/` carga el portal
- [ ] `https://<su-dominio>/api/health` responde OK (vía proxy Next)
- [ ] Login `reception@hospitalsantafe.com` (cambiar password después)
- [ ] Completar preadmisión de prueba con adjunto JPEG
- [ ] Verificar archivo en disco: `ls /var/lib/hospitalsantafe/preadmissions/`
- [ ] Descargar adjunto con usuario staff (no 404)
- [ ] `GET /api/health/cellbyte` o connectivity desde staff
- [ ] Correo de verificación / confirmación (si SMTP configurado)

---

## 12. Migrar desde Railway (corte final)

### 12.1 Base de datos

Desde su PC (con `DATABASE_URL` de Railway):

```bash
pg_dump "$RAILWAY_DATABASE_URL" -Fc -f railway_backup.dump
```

Suba el dump al servidor nuevo y restaure **solo si** quiere conservar datos de Railway:

```bash
scp railway_backup.dump qapread@<host-qa>:/tmp/
ssh qapread@<host-qa>
pg_restore -d "$DATABASE_URL" --clean --if-exists /tmp/railway_backup.dump
```

**Nota:** Si la BD de Railway tiene esquema distinto o datos de prueba mezclados, puede ser más limpio empezar con `backend:init` + migraciones en QA y migrar prod vacío.

### 12.2 Adjuntos

En Railway **probablemente no existen** archivos en disco (sin volumen persistente). Las rutas en BD pueden apuntar a archivos inexistentes. Plan:

- Preadmisiones nuevas en on‑prem tendrán adjuntos correctos.
- Registros viejos: pedir re-subida o ignorar `cedulaimagen` vacío en Cellbyte.

### 12.3 DNS

1. Baje TTL del DNS con anticipación (24–48 h antes).
2. Apunte el dominio público a la **IP del servidor Prod** (registro A o CNAME interno).
3. Verifique HTTPS en prod.

### 12.4 Apagar Railway

Cuando prod on‑prem esté validado:

1. Railway → proyecto → servicios **frontend**, **backend**, **Postgres**
2. **Settings → Delete service** o pausar deploys
3. Revocar variables/secrets si ya no se usan
4. Actualice documentación interna: URL final ya no es `*.up.railway.app`

---

## 13. Actualizar la aplicación (deploys futuros)

En cada servidor, por SSH:

```bash
sudo systemctl stop hospitalsantafe-web
sudo systemctl stop hospitalsantafe-api

sudo -u hospitalsantafe -i
cd /opt/hospitalsantafe
git pull origin main
npm ci
npm run backend:build
npm run build

# Si hay migraciones SQL nuevas:
# psql "$DATABASE_URL" -f db/migrations/NUEVA.sql

exit

sudo systemctl start hospitalsantafe-api
sudo systemctl start hospitalsantafe-web
sudo systemctl status hospitalsantafe-api hospitalsantafe-web
```

---

## 14. Backup recomendado (cron)

```bash
sudo crontab -e
```

```cron
# Backup PostgreSQL diario 2:00 AM
0 2 * * * pg_dump "postgresql://hospital_app:****@localhost:5432/hospital_santa_fe" -Fc -f /var/backups/hospital_$(date +\%Y\%m\%d).dump

# Backup adjuntos semanal
0 3 * * 0 tar czf /var/backups/hospital_preadmissions_$(date +\%Y\%m\%d).tar.gz /var/lib/hospitalsantafe/preadmissions
```

Cree `/var/backups` y restrinja permisos.

---

## 15. Resolución de problemas rápida

| Síntoma | Acción |
|---------|--------|
| 502 Bad Gateway | `systemctl status hospitalsantafe-web`; logs journal |
| API no responde | `curl localhost:8000/api/health`; revisar `.env` y Postgres |
| CORS | `FRONTEND_URL` debe coincidir con URL del navegador |
| Adjunto 404 | Verificar `PREADMISSION_UPLOAD_DIR` y permisos |
| Cellbyte falla | `curl localhost:8000/api/health/cellbyte`; red a IP hospital |
| Build falla por memoria | Aumentar swap o build en CI y copiar `.next` + `backend/dist` |

Ver también [05_RUNBOOK_OPERACION.md](./05_RUNBOOK_OPERACION.md).

---

## 16. Resumen de comandos — copiar/pegar (QA, primera vez)

```bash
# --- como root/sudo: preparación ---
sudo apt update && sudo apt install -y nginx git curl build-essential
sudo useradd -r -m -d /opt/hospitalsantafe -s /bin/bash hospitalsantafe 2>/dev/null || true
sudo mkdir -p /var/lib/hospitalsantafe/preadmissions
sudo chown -R hospitalsantafe:hospitalsantafe /opt/hospitalsantafe /var/lib/hospitalsantafe

# --- PostgreSQL: crear BD (ver sección 3.4) ---

# --- como hospitalsantafe ---
sudo -u hospitalsantafe -i
cd /opt/hospitalsantafe
git clone https://github.com/dycoronelc/hsf.git .
cp .env.example .env && nano .env
cp .env backend/.env && chmod 600 .env backend/.env
npm ci && npm run backend:build && npm run build
npm run backend:sync && npm run backend:init
for f in db/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
exit

# --- systemd + nginx (secciones 8 y 9) ---
# --- smoke test (sección 11) ---
```

Repita en **Prod** con otros nombres de BD, URLs, secretos y certificados.

---

*Documento de entrega — Hospital Santa Fe Panamá*
