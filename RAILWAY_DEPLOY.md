# Despliegue en Railway - Hospital Santa Fe

Guía para desplegar frontend (Next.js) y backend (NestJS) en Railway.

---

## Requisitos previos

- Cuenta en [Railway](https://railway.app)
- Repositorio en GitHub con el código subido

---

## Paso 1: Crear proyecto en Railway

1. Entra a [railway.app](https://railway.app) e inicia sesión con GitHub.
2. **New Project** → **Deploy from GitHub repo**
3. Conecta y selecciona el repositorio `hospitalsantafe`.

---

## Paso 2: Crear el servicio Backend

1. En el proyecto, haz clic en **+ New** → **GitHub Repo** (elige el mismo repo).
2. Renombra el servicio a `backend` (opcional).
3. **Settings** del servicio backend:
   - **Root Directory**: *dejar vacío* (raíz del repo)
   - **Config file path**: `/railway.backend.toml` (recomendado; define build, start y watch paths en el repo)
   - **Build Command**: `npm install && npm run backend:build`
   - **Start Command**: `npm run backend:start:prod`
   - **Watch Paths**: `backend/**` (para que solo se reconstruya cuando cambie el backend)

4. **Añadir PostgreSQL**: En el proyecto, **+ New** → **Database** → **PostgreSQL**. Renombra el servicio a `Postgres` (opcional, para la referencia).

5. **Vincular DATABASE_URL al backend**: En el servicio **backend**, pestaña **Variables** → **+ New Variable** → **Add Reference** → selecciona el servicio PostgreSQL → variable `DATABASE_URL`. Si no aparece como referencia, copia manualmente el valor de `DATABASE_URL` del servicio PostgreSQL.

6. **Variables** (pestaña Variables del backend):
   | Variable | Valor |
   |----------|-------|
   | `DATABASE_URL` | Referencia o copia del valor del servicio PostgreSQL |
   | `FRONTEND_URL` | *(lo configuras después de tener la URL del frontend)* |
   | `NODE_ENV` | `production` |

7. **Pre-deploy Command**: Déjalo vacío o elimínalo. Las tablas se crean automáticamente cuando el backend inicia (TypeORM synchronize).

8. **Generate Domain**: En la pestaña Settings → Networking, haz clic en **Generate Domain**. Copia la URL (ej. `https://hospitalsantafe-backend-production-xxxx.up.railway.app`).

---

## Paso 3: Crear el servicio Frontend

El frontend **no se despliega solo** con el backend: hace falta un **segundo servicio** en el mismo proyecto Railway, apuntando al mismo repositorio.

1. **+ New** → **GitHub Repo** (mismo repo).
2. Renombra el servicio a `frontend` (opcional).
3. **Settings** del servicio frontend:
   - **Root Directory**: *dejar vacío*
   - **Config file path**: `/railway.frontend.toml` (recomendado)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Watch Paths**: `app/**, lib/**, public/**, next.config.js, tailwind.config.js, postcss.config.js, package.json, package-lock.json`

4. **Variables** (pestaña Variables):
   | Variable | Valor |
   |----------|-------|
   | `API_URL` | URL del backend (ej. `https://hospitalsantafe-backend-production-xxxx.up.railway.app`) – **Obligatorio** para que el proxy redirija `/api/*` al backend. Se lee en runtime. |
   | `NEXT_PUBLIC_API_URL` | Igual que API_URL (opcional, para builds que lo necesiten) |

5. **Generate Domain**: En Settings → Networking → **Generate Domain**. Copia la URL del frontend.

---

## Paso 4: Vincular Frontend y Backend

1. Vuelve al servicio **backend**.
2. En Variables, actualiza `FRONTEND_URL` con la URL del frontend (ej. `https://hospitalsantafe-frontend-production-xxxx.up.railway.app`).
3. Redeploya el backend si es necesario (Railway suele hacerlo automáticamente al cambiar variables).

---

## Usuarios por defecto

Al iniciar el backend, se cargan automáticamente los usuarios iniciales si no existen:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@hospitalsantafe.com | admin123 |
| Recepción | reception@hospitalsantafe.com | reception123 |

---

## Resumen de variables por servicio

### Backend
| Variable | Descripción |
|---------|-------------|
| `PORT` | Lo asigna Railway automáticamente |
| `DATABASE_URL` | URL de PostgreSQL (auto-asignada al añadir la base de datos) |
| `FRONTEND_URL` | URL del frontend para CORS |
| `NODE_ENV` | `production` |

### Frontend
| Variable | Descripción |
|---------|-------------|
| `API_URL` | URL pública del backend (obligatorio para el proxy) |

---

## Comandos de referencia

- **Build backend**: `npm run backend:build`
- **Start backend**: `npm run backend:start:prod`
- **Build frontend**: `npm run build`
- **Start frontend**: `npm run start`

---

## Troubleshooting

### Hice push a GitHub pero Railway no se actualizó

**Causa más frecuente:** el deploy **sí se creó pero quedó en SKIPPED** porque los *Watch Paths* del servicio no incluyen los archivos que cambiaste (por ejemplo solo `public/**` y no `app/**`). Railway no falla: simplemente no construye.

1. **Confirma que el push llegó a GitHub**  
   Repositorio actual: `https://github.com/dycoronelc/hsf` rama `main`.

2. **Revisa el historial de despliegues en Railway** (cada servicio → pestaña **Deployments**)  
   - Activa **Show Skipped**: si ves **SKIPPED**, el autodeploy funcionó pero el servicio ignoró el commit por *watch paths*.  
   - Si **no aparece ningún deployment nuevo** al hacer push, el problema es webhook o autodeploy desactivado (pasos 3–6).  
   - Si ves **FAILED**, abre los logs del build (ahí está el error real).

3. **Verifica la conexión GitHub en cada servicio** (Settings → Source)  
   - Repo: `dycoronelc/hsf`  
   - Branch: `main`  
   - **Autodeploy**: activado (botón *Enable* si está apagado)  
   - **Wait for CI**: desactivado salvo que tengas GitHub Actions obligatorias y pasando.

4. **Config file path (muy importante)**  
   Cada servicio debe tener su archivo de config; el `watchPatterns` del repo **sobrescribe** el del dashboard en cada deploy:
   - Backend: `/railway.backend.toml`
   - Frontend: `/railway.frontend.toml`  
   Si este campo está vacío o mal, Railway ignora build/start/watch del monorepo y usa solo la UI (a menudo con watch paths viejos).

5. **Watch Paths en la UI (Settings → Build)**  
   - **Déjalos vacíos.** Si hay texto (p. ej. `app/**, lib/**, ...`), bórralo y guarda.  
   - Los `watchPatterns` en `railway.*.toml` también están desactivados: cada push a `main` reconstruye backend y frontend.  
   - Si vuelves a usar watch paths y ves **SKIPPED / No changes to watched files**, el commit no tocó esas rutas o el patrón está mal (evita listas separadas por comas en un solo campo).

6. **Permisos del bot de Railway en GitHub**  
   GitHub → Settings → Applications → **Railway App** → Configure → acceso al repo `hsf`.

7. **Forzar despliegue del último commit**  
   En el proyecto Railway: `Ctrl+K` → **Deploy Latest Commit** (en backend y en frontend).  
   **No uses solo “Redeploy”** del deployment viejo: eso reutiliza el mismo código anterior.

8. **Reconectar GitHub si no aparece ningún deployment nuevo**  
   Project → servicio → Settings → desconectar y volver a conectar el repo.

9. **Tras cambiar `railway.*.toml`**  
   Haz commit, push y luego **Deploy Latest Commit** una vez en ambos servicios para que Railway tome la config nueva.

- **Solo se desplegó el backend**: En el proyecto Railway debe haber **dos servicios** (backend y frontend). Si solo existe uno, crea el servicio frontend (Paso 3), asigna `API_URL` y haz **Deploy** manual.
- **El frontend no se reconstruye al hacer push**: Los archivos `railway.*.toml` ya no usan *watch paths* restrictivos; cualquier push a `main` debe disparar build en el servicio conectado. Si quieres optimizar costos, puedes volver a añadir `watchPatterns` más adelante.
- **`frontend grpc server closed unexpectedly`**: Error **transitorio de la infraestructura de Railway** (Metal builder), no de tu código. Acciones:
  1. Espera 2–5 minutos y vuelve a desplegar: `Ctrl+K` → **Deploy Latest Commit** (no solo Redeploy del fallido).
  2. Repite hasta 2–3 veces; suele asignar otro builder sano.
  3. Revisa [status.railway.com](https://status.railway.com/) por incidentes.
  4. El repo incluye `Dockerfile.frontend` + `railway.frontend.toml` con `builder = "DOCKERFILE"` para builds más estables que Nixpacks/Railpack.
- **"No start command found"**: Revisa que Build y Start estén configurados en Settings.
- **CORS errors**: Verifica que `FRONTEND_URL` en el backend coincida con la URL real del frontend.
- **API no responde**: Confirma que `NEXT_PUBLIC_API_URL` en el frontend apunte a la URL del backend (sin `/api` al final).
- **No hay tablas en PostgreSQL**: 
  1. Verifica que `DATABASE_URL` esté configurada en el backend (Variables → Add Reference → Postgres → DATABASE_URL).
  2. Añade **Pre-deploy Command**: `cd backend && node dist/sync-db.js` en Settings → Deploy del backend.
  3. Redeploya el backend. Revisa los logs para ver si hay errores de conexión a la BD.

### Limpieza de base de datos (tabla legacy `appointments`)

Si la base fue creada con una versión anterior que incluía el módulo de citas, ejecuta una sola vez el script SQL (desde tu máquina con `psql` o el cliente SQL de Railway):

`db/migrations/20260513_drop_legacy_appointments.sql`

Elimina la tabla `appointments` y crea índices útiles para preadmisiones, turnos e integración. No afecta al código actual del repositorio.
