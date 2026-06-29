# Despliegue Producción — Guía resumida
## Hospital Santa Fe — On‑premise (lecciones QA incluidas)

**Versión:** 1.1 · Junio 2026  
**Servidor prod:** `prodpreadinex@prodpreadhsf` (o IP que indique TI)  
**Referencia ampliada:** [13_DESPLIEGUE_ONPREM_QA_PROD.md](./13_DESPLIEGUE_ONPREM_QA_PROD.md)

---

## Reglas importantes (errores evitados en QA)

| Tema | Qué hacer |
|------|-----------|
| Usuario SSH | **`prodpreadinex`** con sudo — no usar `hospitalsantafe` para admin |
| `.env` | Un archivo en `/opt/hospitalsantafe/.env` + copia idéntica en `backend/.env` |
| **`PORT` en `.env`** | **No incluir** — definir puerto solo en systemd |
| Permisos | Compilar como `hospitalsantafe` o `chown -R hospitalsantafe` al final |
| PostgreSQL remoto | **No exponer** 5432; usar SSH + `psql localhost` |
| Cámara QR | **HTTPS obligatorio** (HTTP solo en localhost) |
| Catálogo geo | `backend:init` ya sincroniza referencia TE completa (desde v1.1) |

---

## Arquitectura en el servidor

```text
Navegador → nginx:443 → Next.js:3000 → /api/* → NestJS:8000 → PostgreSQL:5432 (localhost)
                                                      ↘ /var/lib/hospitalsantafe/preadmissions
```

---

## Paso 1 — Conectar y preparar

```bash
ssh prodpreadinex@<IP-o-hostname-prod>

sudo apt update
sudo apt install -y nginx git curl build-essential postgresql-client

node -v && npm -v && which node && which npm
```

```bash
sudo useradd -r -m -d /opt/hospitalsantafe -s /bin/bash hospitalsantafe 2>/dev/null || true
sudo mkdir -p /opt/hospitalsantafe /var/lib/hospitalsantafe/preadmissions
sudo chown -R hospitalsantafe:hospitalsantafe /opt/hospitalsantafe /var/lib/hospitalsantafe
sudo chmod 750 /var/lib/hospitalsantafe/preadmissions
```

---

## Paso 2 — PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER hospital_app WITH PASSWORD 'PASSWORD_PROD_FUERTE';
CREATE DATABASE hospital_santa_fe OWNER hospital_app;
GRANT ALL PRIVILEGES ON DATABASE hospital_santa_fe TO hospital_app;
\q
```

```bash
psql "postgresql://hospital_app:PASSWORD_PROD_FUERTE@localhost:5432/hospital_santa_fe" -c "SELECT 1;"
```

---

## Paso 3 — Clonar repositorio

```bash
cd /opt/hospitalsantafe
sudo git clone https://github.com/dycoronelc/hsf.git .
sudo git checkout main
sudo chown -R hospitalsantafe:hospitalsantafe /opt/hospitalsantafe
```

---

## Paso 4 — Variables de entorno

```bash
cd /opt/hospitalsantafe
sudo cp .env.example .env
sudo nano .env
```

Ejemplo producción:

```bash
DATABASE_URL=postgresql://hospital_app:PASSWORD_PROD_FUERTE@localhost:5432/hospital_santa_fe
DATABASE_SSL=false
NODE_ENV=production

FRONTEND_URL=https://pread.hospitalsantafepanama.com
APP_BASE_URL=https://pread.hospitalsantafepanama.com

API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

JWT_SECRET=<openssl rand -base64 48 — distinto al de QA>

PREADMISSION_UPLOAD_DIR=/var/lib/hospitalsantafe/preadmissions

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@hospitalsantafepanama.com
SMTP_PASS=CONTRASEÑA_APLICACION
SMTP_FROM="Hospital Santa Fe <correo@hospitalsantafepanama.com>"

CELLBYTE_BASE_URL=<URL prod>
CELLBYTE_USERNAME=<usuario prod>
CELLBYTE_PASSWORD=<password prod>
```

```bash
sudo cp .env backend/.env
sudo chown hospitalsantafe:hospitalsantafe .env backend/.env
sudo chmod 600 .env backend/.env
```

> **No** agregue `PORT=` al `.env`.

---

## Paso 5 — Dependencias y compilación

```bash
sudo -u hospitalsantafe -i
cd /opt/hospitalsantafe
npm ci
npm run backend:build
npm run build
exit
```

---

## Paso 6 — Base de datos y catálogos

```bash
cd /opt/hospitalsantafe
sudo -u hospitalsantafe bash -c 'set -a && source .env && set +a && npm run backend:sync'
sudo -u hospitalsantafe bash -c 'set -a && source .env && set +a && npm run backend:init'
```

`backend:init` crea usuarios demo, servicios, nacionalidades y **catálogo geo completo** (referencia TE + parches + sync).

Migraciones SQL restantes (una sola vez):

```bash
export DATABASE_URL="postgresql://hospital_app:PASSWORD@localhost:5432/hospital_santa_fe"
for f in db/migrations/*.sql; do
  echo "=== $f ==="
  psql "$DATABASE_URL" -f "$f"
done
```

> Las migraciones geo (`20260525`, `20260526`) son idempotentes si `backend:init` ya las aplicó.

Validar geo:

```bash
psql "$DATABASE_URL" -f db/validacion_geo_catalogo.sql
```

Esperado: filas **REFERENCIA** y **APLICACION** con mismos conteos (~13 prov, ~82 dist, ~680+ corr).

---

## Paso 7 — Systemd

**API** — `/etc/systemd/system/hospitalsantafe-api.service`:

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
Environment=PORT=8000
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Web** — `/etc/systemd/system/hospitalsantafe-web.service`:

```ini
[Unit]
Description=Hospital Santa Fe Web (Next.js)
After=hospitalsantafe-api.service

[Service]
Type=simple
User=hospitalsantafe
Group=hospitalsantafe
WorkingDirectory=/opt/hospitalsantafe
EnvironmentFile=/opt/hospitalsantafe/.env
Environment=PORT=3000
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable hospitalsantafe-api hospitalsantafe-web
sudo systemctl start hospitalsantafe-api
sleep 2
sudo systemctl start hospitalsantafe-web
```

Verificar:

```bash
curl -s http://127.0.0.1:8000/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
ss -tlnp | grep -E ':3000|:8000'
```

---

## Paso 8 — Nginx + HTTPS

Use certificado de TI en `server_name` de producción. Proxy a `127.0.0.1:3000`. Redirigir HTTP→HTTPS.

`FRONTEND_URL` y `APP_BASE_URL` deben coincidir con la URL del navegador.

---

## Paso 9 — Smoke test

- [ ] Portal HTTPS carga
- [ ] `/api/health` OK
- [ ] Login staff → cambiar contraseñas demo
- [ ] Preadmisión + adjunto en disco
- [ ] Escaneo QR con cámara (HTTPS)
- [ ] Correo SMTP
- [ ] Cellbyte (si aplica)

---

## Reparar catálogo geo en servidor ya desplegado

Si QA/prod se instaló antes de esta corrección:

```bash
cd /opt/hospitalsantafe
git pull origin main
npm run backend:build
sudo -u hospitalsantafe bash -c 'set -a && source .env && set +a && npm run backend:sync-geo'
psql "$DATABASE_URL" -f db/validacion_geo_catalogo.sql
```

---

## Comandos útiles

Actualización rápida (git pull + build + restart):

```bash
sudo bash /opt/hospitalsantafe/scripts/deploy-onprem.sh
```

Variables opcionales: `SKIP_GIT_PULL=1`, `SKIP_NPM_CI=1`, `GIT_BRANCH=main`.

```bash
sudo systemctl restart hospitalsantafe-api hospitalsantafe-web
sudo journalctl -u hospitalsantafe-api -n 50 --no-pager
sudo cp /opt/hospitalsantafe/.env /opt/hospitalsantafe/backend/.env
```

---

## Checklist final

- [ ] Postgres solo localhost
- [ ] `.env` sin `PORT=`
- [ ] systemd API `:8000`, web `:3000`
- [ ] HTTPS activo
- [ ] Catálogo geo validado
- [ ] Contraseñas demo cambiadas
- [ ] Railway apagado tras corte DNS
