# Documento técnico de infraestructura y despliegue  
## Plataforma Hospital Santa Fe — Flujo de pacientes y preadmisión digital

**Versión del documento:** 1.0  
**Aplicable al repositorio:** `hospital-santa-fe-platform` (monorepo: frontend Next.js + backend NestJS)  
**Audiencia:** TI del hospital, infraestructura, seguridad, proveedores de hosting on‑premise o nube.

---

## 1. Resumen ejecutivo

La plataforma es una aplicación web compuesta por **dos servicios de aplicación** y **una base de datos relacional**:

| Componente | Tecnología | Función |
|------------|------------|---------|
| **Frontend** | Next.js 14 (Node.js) | Portal paciente, preadmisión, consola staff, monitor, administración |
| **Backend (API)** | NestJS 10 (Node.js) | REST API `/api/*`, autenticación JWT, reglas de negocio, correo, integraciones |
| **Base de datos** | PostgreSQL 14+ | Datos transaccionales (usuarios, turnos, preadmisiones, auditoría, etc.) |
| **Correo saliente** | SMTP (Google Workspace u otro) | Confirmación de preadmisión, verificación de email, notificaciones de turnos |
| **Integración opcional** | HTTPS → Cellbyte | Envío de preadmisión al sistema externo del hospital |

No existe un único instalador “todo en uno”: el hospital debe provisionar **servidor(es)**, **PostgreSQL**, **certificados TLS**, **DNS** y **variables de entorno** según este documento.

---

## 2. Arquitectura lógica

```mermaid
flowchart TB
  subgraph users [Usuarios]
    PAC[Pacientes - navegador / móvil]
    STAFF[Personal - PC recepción / anfitrión]
    TV[Monitor / TV - pantalla llamados]
  end

  subgraph dmz [Red hospital - DMZ o VLAN aplicaciones]
    RP[Reverse proxy HTTPS<br/>nginx / IIS / F5]
    FE[Frontend Next.js<br/>puerto 3000]
    API[Backend NestJS<br/>puerto 8000]
  end

  subgraph data [Datos y servicios]
    PG[(PostgreSQL)]
    SMTP[SMTP Google Workspace<br/>smtp.gmail.com:587]
    CELL[Cellbyte API<br/>opcional]
  end

  PAC --> RP
  STAFF --> RP
  TV --> RP
  RP --> FE
  FE -->|proxy /api/*| API
  API --> PG
  API --> SMTP
  API -.->|POST JSON| CELL
```

### Flujo de tráfico HTTP

1. El usuario accede por **HTTPS** al dominio del frontend (ej. `https://pacientes.hospitalsantafepanama.com`).
2. El frontend sirve la SPA/SSR de Next.js.
3. Las llamadas del navegador van a **`/api/...`** en el **mismo dominio** del frontend; Next.js **reenvía** (rewrite) al backend usando `API_URL`.
4. El backend valida JWT (rutas protegidas), ejecuta lógica y consulta PostgreSQL.

Esto evita exponer CORS complejo al paciente: el origen del navegador es siempre el del frontend.

---

## 3. Módulos funcionales (aplicación)

| Módulo | Ruta web (ejemplos) | Rol típico |
|--------|---------------------|------------|
| Portal / inicio | `/` | Público |
| Preadmisión digital | `/preadmission` | Público (+ verificación email) |
| Login / registro | `/login`, `/register` | Paciente / staff |
| Turnos paciente | `/tickets`, `/tickets/new` | Paciente autenticado |
| Dashboard | `/dashboard` | Paciente |
| Consola operativa | `/staff` | Recepción, técnicos |
| Monitor llamados | `/monitor` | Pantalla TV (solo lectura) |
| Kiosco check-in | `/kiosk` | Kiosco recepción |
| Anfitrión | `/host` | Anfitrión |
| Administración | `/admin`, `/admin/users`, `/admin/permissions`, `/admin/ticket-types` | Admin |
| Reportes | `/reports` | Supervisor / admin |
| Encuestas | `/surveys/[id]` | Paciente (enlace por correo) |

**API:** prefijo global ` /api` (ej. `GET /api/auth/me`, `POST /api/preadmission/public`).

Documentación funcional ampliada: `Hospital_Santa_Fe_Plataforma_Flujo_Preadmision.md`, `Preadmision.md`.

---

## 4. Requisitos de infraestructura

### 4.1 Software base (servidores de aplicación)

| Requisito | Versión mínima recomendada | Notas |
|-----------|----------------------------|--------|
| **Node.js** | 18 LTS o 20 LTS | Mismo runtime para build y ejecución |
| **npm** | 9+ | Incluido con Node; monorepo en raíz del repo |
| **Sistema operativo** | Windows Server 2019+, Ubuntu 22.04+, RHEL 8+ | Linux preferido para producción |
| **PostgreSQL** | 14+ (15 recomendado) | No usar SQLite en producción |
| **Git** | 2.x | Despliegue desde repositorio |

### 4.2 Dimensionamiento orientativo

Valores de partida para un hospital mediano (ajustar según concurrencia real):

| Entorno | vCPU | RAM | Disco app | Disco PostgreSQL |
|---------|------|-----|-----------|------------------|
| **Producción** (FE + API en mismo servidor) | 4 | 8 GB | 40 GB SSD + volumen adjuntos | 50–100 GB SSD (solo datos transaccionales) |
| **Producción** (FE y API separados) | 2 + 2 | 4 + 4 GB | 20 GB c/u | 100 GB SSD dedicado |
| **QA / staging** | 2 | 4 GB | 30 GB | 50 GB |

**Nota sobre adjuntos:** las preadmisiones envían imágenes/PDF por **multipart**; el API los guarda en disco (`uploads/preadmissions/{id}/` o `PREADMISSION_UPLOAD_DIR`) y en PostgreSQL solo guarda la **ruta relativa** (`varchar(512)`). Registros antiguos con base64 en `text` siguen legibles hasta migrarlos. Incluir el volumen de adjuntos en backup y retención (no solo la BD). Límite por archivo: **15 MB**; nginx/proxy: `client_max_body_size` ≥ 20M.

### 4.3 Red y puertos

| Puerto | Servicio | Exposición |
|--------|----------|------------|
| **443** (HTTPS) | Reverse proxy → Frontend | Internet / Wi‑Fi pacientes / LAN staff |
| **3000** | Next.js (`npm run start`) | Solo localhost o red interna (detrás del proxy) |
| **8000** | NestJS API | Solo localhost o red interna (no público si se usa proxy `/api`) |
| **5432** | PostgreSQL | Solo red interna; **no** exponer a Internet |
| **587** (salida) | SMTP TLS | Salida hacia `smtp.gmail.com` u servidor relay del hospital |

### 4.4 DNS y certificados

| Registro | Uso |
|----------|-----|
| `pacientes.hospitalsantafepanama.com` (ejemplo) | Frontend (URL pública principal) |
| Opcional subdominio API | Solo si no se usa proxy `/api` en el mismo dominio |

- Certificado **TLS válido** (Let's Encrypt, CA corporativa o WAF del hospital).
- **HSTS** y redirección HTTP→HTTPS recomendados en el proxy.

### 4.5 Firewall (reglas mínimas)

| Origen | Destino | Puerto | Propósito |
|--------|---------|--------|-----------|
| Internet / VLAN usuarios | Proxy HTTPS | 443 | Acceso web |
| Servidor app | PostgreSQL | 5432 | Datos |
| Servidor app | Internet | 587 | Envío correo SMTP |
| Servidor app | Cellbyte (IP/FQDN acordado) | 443 | Integración opcional |
| Administradores TI | Servidores (SSH/RDP) | según política | Mantenimiento |

---

## 5. Variables de entorno

Archivo de referencia: `.env.example` en la raíz del repositorio.  
**Nunca** versionar `.env` con secretos en Git.

### 5.1 Carga de variables en el backend

El backend NestJS usa `@nestjs/config` con `ConfigModule.forRoot()` **sin ruta fija** al `.env`. Por defecto busca `.env` en el **directorio de trabajo actual**.

Los scripts oficiales ejecutan desde `backend/` (`cd backend && node dist/main`). Por tanto:

- **Opción A (recomendada):** copiar o enlazar `.env` también en `backend/.env`.
- **Opción B:** exportar variables en el servicio systemd/Windows Service.
- **Opción C:** definir variables en el panel del orquestador (Kubernetes, Railway, etc.).

### 5.2 Tabla completa de variables

#### Base de datos y entorno

| Variable | Obligatoria | Ejemplo | Descripción |
|----------|-------------|---------|-------------|
| `DATABASE_URL` | **Sí** (prod) | `postgresql://app:****@db.internal:5432/hospital_santa_fe` | Conexión PostgreSQL |
| `DATABASE_SSL` | No | `true` | SSL hacia PostgreSQL (cloud managed) |
| `NODE_ENV` | **Sí** (prod) | `production` | Habilita envío real de correos y comportamiento prod |
| `PORT` | No | `8000` | Puerto API; en PaaS lo asigna la plataforma |

#### URLs y CORS

| Variable | Obligatoria | Ejemplo | Descripción |
|----------|-------------|---------|-------------|
| `FRONTEND_URL` | **Sí** (prod) | `https://pacientes.hospitalsantafepanama.com` | Origen permitido en CORS |
| `APP_BASE_URL` | Recomendada | Igual que frontend | Enlaces de recuperación de contraseña (cuando se implemente envío) |

#### Frontend (servicio Next.js)

| Variable | Obligatoria | Ejemplo | Descripción |
|----------|-------------|---------|-------------|
| `API_URL` | **Sí** (prod) | `http://127.0.0.1:8000` o URL interna API | Destino del **rewrite** `/api/*` en **runtime** |
| `NEXT_PUBLIC_API_URL` | Opcional | Misma URL | Build-time; secundario si `API_URL` está en runtime |

En despliegue con proxy único, `API_URL` suele ser la URL **interna** del backend (`http://api-internal:8000`), no la pública.

#### Adjuntos de preadmisión

| Variable | Obligatoria | Ejemplo | Descripción |
|----------|-------------|---------|-------------|
| `PREADMISSION_UPLOAD_DIR` | No | `/app/backend/uploads/preadmissions` | Carpeta raíz de archivos. **En Railway:** montar volumen en esta ruta o definir esta variable igual al mount path. Sin volumen, los adjuntos se pierden al redeploy. |

Incluir esta ruta en backup y permisos de escritura para el usuario del servicio `hospital-api`.

#### Seguridad

| Variable | Obligatoria | Ejemplo | Descripción |
|----------|-------------|---------|-------------|
| `JWT_SECRET` | **Sí** (prod) | Cadena aleatoria ≥ 32 caracteres | Firma de tokens JWT (expiración 30 min en código actual) |

#### Correo (SMTP)

| Variable | Obligatoria | Ejemplo | Descripción |
|----------|-------------|---------|-------------|
| `SMTP_HOST` | **Sí** (si hay correo) | `smtp.gmail.com` | Servidor SMTP |
| `SMTP_PORT` | **Sí** | `587` | Puerto STARTTLS |
| `SMTP_USER` | **Sí** | `pagos@hospitalsantafepanama.com` | Cuenta autenticación |
| `SMTP_PASS` | **Sí** | Contraseña de aplicación 16 caracteres | **No** la clave de login Google |
| `SMTP_FROM` | Recomendada | `"Hospital Santa Fe <pagos@hospitalsantafepanama.com>"` | Remitente visible |
| `SMTP_SEND_IN_DEV` | No | `true` | Solo pruebas: envía correo real sin `NODE_ENV=production` |

Guía detallada: [GUIA_SMTP_GOOGLE_WORKSPACE.md](./GUIA_SMTP_GOOGLE_WORKSPACE.md).

#### Integración Cellbyte (opcional)

| Variable | Obligatoria | Ejemplo | Descripción |
|----------|-------------|---------|-------------|
| `CELLBYTE_BASE_URL` | No | `http://192.168.30.41:8080/cbUat` | URL base UAT/prod (sin `/api/v1/...`) |
| `CELLBYTE_USERNAME` | Con URL | `preadm@hospitalsantafepanama.com` | Usuario para `POST /api/v1/auth` |
| `CELLBYTE_PASSWORD` | Con URL | *(secreto)* | Contraseña Cellbyte |
| `CELLBYTE_URL` | No | *(legado)* | URL completa antigua; se deriva la base si no hay `CELLBYTE_BASE_URL` |

Tras guardar una preadmisión, el backend autentica contra Cellbyte y envía `POST /api/v1/pre-admission` con `{ "json": "<payload JSON>" }`. Si la URL apunta a red local (`192.168.x.x`) y el backend está en la nube, el envío fallará hasta desplegar en la red del hospital; use `GET /integrations/cellbyte/connectivity` (staff autenticado) para verificar alcance y credenciales.

---

## 6. Base de datos PostgreSQL

### 6.1 Creación inicial

```sql
CREATE USER hospital_app WITH PASSWORD '***';
CREATE DATABASE hospital_santa_fe OWNER hospital_app;
GRANT ALL PRIVILEGES ON DATABASE hospital_santa_fe TO hospital_app;
```

Cadena de conexión:

```text
DATABASE_URL=postgresql://hospital_app:PASSWORD@HOST:5432/hospital_santa_fe
```

### 6.2 Esquema y datos iniciales

| Mecanismo | Cuándo usarlo |
|-----------|----------------|
| `npm run backend:init` | **Primera instalación**: tablas (vía TypeORM `synchronize`), usuarios demo, sedes, servicios, catálogos CSV |
| `npm run backend:start:prod` | Ejecuta `init-data` antes del API si se usa script `backend:start:prod` |
| Scripts SQL en `db/migrations/` | Ajustes puntuales (ej. matriz de permisos admin, limpieza legacy) |

**Importante producción:** en `app.module.ts` está `synchronize: true`, que auto-altera el esquema al arrancar. Para entorno hospitalario estable se recomienda:

1. Pasar a **migraciones explícitas** (TypeORM migrations o scripts SQL versionados).
2. Poner `synchronize: false` en producción tras baseline inicial.

Ejecutar manualmente si aplica:

- `db/migrations/20260513_drop_legacy_appointments.sql`
- `db/migrations/20260514_admin_role_matrix_rows.sql`

### 6.3 Backup y recuperación

| Aspecto | Recomendación |
|---------|----------------|
| **Frecuencia** | Backup completo diario + WAL/archivo si crítico |
| **Retención** | Según política hospital (ej. 30–90 días) |
| **Prueba de restore** | Trimestral en entorno aislado |
| **RPO / RTO** | Definir con continuidad operativa del hospital |

Incluir en backup la carpeta de adjuntos (`PREADMISSION_UPLOAD_DIR` o `backend/uploads/preadmissions`) junto con PostgreSQL; monitorear espacio en disco del API.

### 6.4 Catálogos estáticos

Cargados desde CSV en `init-data` (raíz del repo):

- `nacionalidades.csv`
- `ubicacion_geo.csv` (provincias, distritos, corregimientos)

---

## 7. Despliegue on‑premise (referencia)

### 7.1 Estructura recomendada

```
/opt/hospitalsantafe/          # Clon del repositorio
  ├── app/                     # Frontend Next.js
  ├── backend/dist/            # API compilada
  ├── .env                     # Secretos (permisos 600)
  └── backend/.env             # Copia o enlace al .env raíz
```

### 7.2 Build de artefactos

En servidor de build o CI (con acceso a Internet para `npm install`):

```bash
cd /opt/hospitalsantafe
git pull
npm install
npm run backend:build
npm run build          # frontend producción
```

### 7.3 Arranque (ejemplo Linux + systemd)

**API** (`/etc/systemd/system/hospitalsantafe-api.service`):

```ini
[Unit]
Description=Hospital Santa Fe API
After=network.target postgresql.service

[Service]
Type=simple
User=hospitalsantafe
WorkingDirectory=/opt/hospitalsantafe/backend
EnvironmentFile=/opt/hospitalsantafe/.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Primera vez (datos iniciales):

```bash
cd /opt/hospitalsantafe
npm run backend:init
```

**Frontend** (`hospitalsantafe-web.service`):

```ini
[Service]
Type=simple
User=hospitalsantafe
WorkingDirectory=/opt/hospitalsantafe
EnvironmentFile=/opt/hospitalsantafe/.env
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=on-failure
```

```bash
sudo systemctl enable --now hospitalsantafe-api hospitalsantafe-web
```

### 7.4 Reverse proxy (nginx – ejemplo)

```nginx
server {
    listen 443 ssl http2;
    server_name pacientes.hospitalsantafepanama.com;

    ssl_certificate     /etc/ssl/certs/hospital.crt;
    ssl_certificate_key /etc/ssl/private/hospital.key;

    client_max_body_size 20M;   # preadmisión multipart (adjuntos hasta 15 MB c/u)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

El frontend reenvía `/api` al backend vía `API_URL=http://127.0.0.1:8000` en `.env`.

### 7.5 Windows Server

Equivalente con **IIS** (URL Rewrite + ARR) o **nginx for Windows**, y servicios NSSM para Node. Mismas variables de entorno y puertos.

---

## 8. Despliegue en nube (alternativa)

El repositorio incluye configuración de referencia para **Railway**:

- `RAILWAY_DEPLOY.md`
- `railway.backend.toml`
- `railway.frontend.toml`

Arquitectura: 2 servicios (frontend + backend) + PostgreSQL gestionado. Adaptable a **Azure App Service**, **AWS ECS**, **Google Cloud Run** manteniendo la misma separación y variables.

---

## 9. Seguridad y cumplimiento

| Tema | Implementación actual | Recomendación hospital |
|------|----------------------|------------------------|
| Autenticación API | JWT Bearer, expiración 30 min | Rotar `JWT_SECRET`; HTTPS obligatorio |
| Contraseñas usuarios | bcrypt | Forzar cambio de usuarios por defecto post‑go‑live |
| CORS | Lista: `FRONTEND_URL` + localhost dev | Un solo dominio prod en `FRONTEND_URL` |
| Permisos finos | Matriz por rol (`admin_role_matrix_rows`, guards) | Revisar roles en `/admin/permissions` |
| Auditoría | Tabla `audit_log` | Retención y acceso solo auditor/admin |
| Datos clínicos / personales | Preadmisión con identificación, imágenes | Política de privacidad, consentimiento, retención |
| Secretos | Variables de entorno | Vault / gestor secretos del hospital |
| Correo | SMTP TLS | Buzón dedicado; ver guía Google Workspace |

### Usuarios creados en init (cambiar en go‑live)

| Rol | Email | Contraseña inicial |
|-----|-------|-------------------|
| Admin | admin@hospitalsantafe.com | admin123 |
| Recepción | reception@hospitalsantafe.com | reception123 |

**Acción obligatoria:** cambiar contraseñas y, si es posible, desactivar o renombrar cuentas demo.

---

## 10. Integraciones externas

### 10.1 Google Workspace (correo)

- Canal único de notificaciones al paciente (**sin SMS** en código actual).
- Eventos: verificación email, confirmación preadmisión (con **imagen QR** embebida), turno creado/llamado, encuesta.

### 10.2 Cellbyte

- Al guardar preadmisión: POST JSON a `CELLBYTE_URL` si está definida.
- Bitácora en `integration_log`.
- Coordinar con Cellbyte: URL, autenticación futura, IP de salida del servidor app, ambiente QA/Prod.

### 10.3 HIS / LIS / RIS

No hay integración bidireccional estándar en este despliegue base; prevista como fase 2 en documentación funcional.

---

## 11. Monitoreo y operación

| Elemento | Qué monitorear |
|----------|----------------|
| Procesos Node | `systemctl status`, reinicios, CPU/RAM |
| PostgreSQL | Conexiones, espacio en disco, backups OK |
| Logs API | Errores SMTP, Cellbyte, 5xx |
| Logs frontend | Errores de build/start |
| Salud HTTP | `GET /api` o endpoint health si se expone |
| Correo | Cola/rebotes en Google Admin |

**Logs aplicación:** salida estándar de Node (NestJS logger). Centralizar con stack del hospital (ELK, Grafana, Windows Event Forwarding).

---

## 12. Checklist de puesta en producción

### Infraestructura

- [ ] Servidor(es) o PaaS provisionados según dimensionamiento
- [ ] PostgreSQL instalado, BD creada, red restringida
- [ ] Node.js 18+ instalado
- [ ] DNS y certificado TLS en proxy
- [ ] Reglas firewall (443, 5432 interno, 587 salida)
- [ ] Backups PostgreSQL programados y probados

### Aplicación

- [ ] Repositorio desplegado en versión etiquetada (release Git)
- [ ] `npm install` + `backend:build` + `build` frontend
- [ ] `.env` configurado (backend lee variables correctamente)
- [ ] `JWT_SECRET` único de producción
- [ ] `FRONTEND_URL` y `API_URL` coherentes con proxy
- [ ] `npm run backend:init` o proceso equivalente ejecutado una vez
- [ ] Scripts SQL de `db/migrations/` aplicados si corresponde
- [ ] Servicios API y web arrancan al boot y se reinician ante fallo

### Correo

- [ ] Buzón SMTP (ej. `pagos@...`) con 2FA y contraseña de aplicación
- [ ] Variables `SMTP_*` en secretos
- [ ] Prueba: código verificación preadmisión + confirmación con QR en correo

### Seguridad y go‑live

- [ ] Contraseñas demo cambiadas
- [ ] Roles y matriz de permisos revisados
- [ ] Capacitación staff (recepción, anfitrión, monitor)
- [ ] Plan de contingencia manual si cae la plataforma (documentado en `RESPUESTA_ACLARACIONES.md`)

### Integración

- [ ] `CELLBYTE_URL` configurada o decisión explícita de solo bitácora
- [ ] Prueba end‑to‑end preadmisión → Cellbyte en QA

---

## 13. Documentación relacionada en el repositorio

### Paquete de entrega oficial

Índice maestro: **[docs/entrega/INDICE_ENTREGA.md](./entrega/INDICE_ENTREGA.md)**

| Documento | Contenido |
|-----------|-----------|
| [01 Manual paciente](./entrega/01_MANUAL_USUARIO_PACIENTE.md) | Uso preadmisión y turnos |
| [02 Manual staff](./entrega/02_MANUAL_USUARIO_STAFF.md) | Operación recepción/anfitrión |
| [03 Manual administrador](./entrega/03_MANUAL_ADMINISTRADOR.md) | Usuarios y permisos |
| [04 Alcance funcional](./entrega/04_ALCANCE_FUNCIONAL.md) | Módulos entregados |
| [05 Runbook](./entrega/05_RUNBOOK_OPERACION.md) | Soporte e incidentes |
| [06 Guía Cellbyte](./entrega/06_GUIA_INTEGRACION_CELLBYTE.md) | Integración |
| [07 Referencia API](./entrega/07_REFERENCIA_API.md) | Endpoints REST |
| [08 Acta UAT](./entrega/08_ACTA_ACEPTACION_UAT.md) | Aceptación |
| [09 Matriz trazabilidad](./entrega/09_MATRIZ_TRAZABILIDAD.md) | Requisitos |
| [10 Release notes](./entrega/10_RELEASE_NOTES.md) | Versión |
| [11 Inventario secretos](./entrega/11_INVENTARIO_SECRETOS.md) | Credenciales |
| [12 Plan capacitación](./entrega/12_PLAN_CAPACITACION.md) | Formación |
| [13 Despliegue QA/Prod](./entrega/13_DESPLIEGUE_ONPREM_QA_PROD.md) | Servidores cliente |

### Documentos técnicos complementarios

| Documento | Contenido |
|-----------|-----------|
| [README.md](../README.md) | Inicio rápido desarrollo |
| [SETUP.md](../SETUP.md) | Instalación local |
| [.env.example](../.env.example) | Plantilla variables |
| [RAILWAY_DEPLOY.md](../RAILWAY_DEPLOY.md) | Despliegue PaaS Railway |
| [GUIA_SMTP_GOOGLE_WORKSPACE.md](./GUIA_SMTP_GOOGLE_WORKSPACE.md) | Correo institucional |
| [RESPUESTA_INFORME_PRUEBAS_HOSPITAL.md](./RESPUESTA_INFORME_PRUEBAS_HOSPITAL.md) | Respuesta QA |
| [Hospital_Santa_Fe_Plataforma_Flujo_Preadmision.md](../Hospital_Santa_Fe_Plataforma_Flujo_Preadmision.md) | Visión funcional |

---

## 14. Contacto técnico para evolución

Para cambios de arquitectura (migraciones formales, object storage para adjuntos, alta disponibilidad, WAF), registrar requerimiento con el equipo de desarrollo indicando entorno objetivo (on‑premise / nube) y restricciones de red del hospital.

---

*Documento generado a partir del estado del código en el repositorio `hospital-santa-fe-platform`. Revisar al actualizar versiones de Node, Next.js o NestJS.*
