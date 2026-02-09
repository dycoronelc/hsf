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
   - **Build Command**: `npm install && npm run backend:build`
   - **Start Command**: `npm run backend:start:prod`
   - **Watch Paths**: `backend/**` (para que solo se reconstruya cuando cambie el backend)

4. **Añadir PostgreSQL**: En el proyecto, **+ New** → **Database** → **PostgreSQL**. Railway crea la base de datos y la variable `DATABASE_URL` automáticamente (se comparte con los servicios del mismo proyecto).

5. **Variables** (pestaña Variables del backend):
   | Variable | Valor |
   |----------|-------|
   | `DATABASE_URL` | *(auto-asignada por Railway al añadir PostgreSQL)* |
   | `FRONTEND_URL` | *(lo configuras después de tener la URL del frontend, ej. `https://tu-frontend.railway.app`)* |
   | `NODE_ENV` | `production` |

6. **Generate Domain**: En la pestaña Settings → Networking, haz clic en **Generate Domain**. Copia la URL (ej. `https://hospitalsantafe-backend-production-xxxx.up.railway.app`).

---

## Paso 3: Crear el servicio Frontend

1. **+ New** → **GitHub Repo** (mismo repo).
2. Renombra el servicio a `frontend` (opcional).
3. **Settings** del servicio frontend:
   - **Root Directory**: *dejar vacío*
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Watch Paths**: `app/**, lib/**, public/**, next.config.js, tailwind.config.js, postcss.config.js, package.json, package-lock.json`

4. **Variables** (pestaña Variables):
   | Variable | Valor |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | URL del backend (ej. `https://hospitalsantafe-backend-production-xxxx.up.railway.app`) |

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
| `NEXT_PUBLIC_API_URL` | URL pública del backend |

---

## Comandos de referencia

- **Build backend**: `npm run backend:build`
- **Start backend**: `npm run backend:start:prod`
- **Build frontend**: `npm run build`
- **Start frontend**: `npm run start`

---

## Troubleshooting

- **"No start command found"**: Revisa que Build y Start estén configurados en Settings.
- **CORS errors**: Verifica que `FRONTEND_URL` en el backend coincida con la URL real del frontend.
- **API no responde**: Confirma que `NEXT_PUBLIC_API_URL` en el frontend apunte a la URL del backend (sin `/api` al final).
