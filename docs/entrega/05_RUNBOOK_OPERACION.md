# Runbook de operación y soporte
## Plataforma Hospital Santa Fe

**Versión:** 1.0 · **Mayo 2026**

---

## 1. Arquitectura operativa

| Servicio | Tecnología | Puerto típico |
|----------|------------|---------------|
| Frontend | Next.js | 3000 |
| Backend API | NestJS | 8000 (`PORT`) |
| Base de datos | PostgreSQL | 5432 |
| Adjuntos | Disco / volumen | `PREADMISSION_UPLOAD_DIR` |

El frontend proxya `/api/*` hacia el backend vía `API_URL`.

---

## 2. Variables de entorno críticas

### Backend (obligatorias producción)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Secreto ≥ 32 caracteres |
| `FRONTEND_URL` | URL pública frontend (CORS) |

### Backend (operación)

| Variable | Descripción |
|----------|-------------|
| `PREADMISSION_UPLOAD_DIR` | Raíz adjuntos (usar volumen persistente) |
| `RAILWAY_VOLUME_MOUNT_PATH` | Auto-detectado si hay volumen Railway |
| `SMTP_*` | Correo saliente |
| `CELLBYTE_*` | Integración preadmisión |

### Frontend

| Variable | Descripción |
|----------|-------------|
| `API_URL` | URL backend (runtime proxy) |

Plantilla completa: `.env.example` en raíz del repositorio.

---

## 3. Arranque y redeploy

### Desarrollo local

```bash
npm install
npm run backend:build
npm run backend:init    # solo primera vez
npm run backend:dev     # terminal 1
npm run dev             # terminal 2
```

### Producción

```bash
npm run backend:build
npm run backend:start:prod   # sync-db + init-data + API
npm run build
npm run start
```

### Railway

- Backend: `railway.backend.toml` → `npm run backend:start:prod`
- Frontend: `railway.frontend.toml` → `npm run build` + `npm run start`
- Tras cambiar variables: redeploy ambos servicios
- Si deploy **SKIPPED**: ver RAILWAY_DEPLOY.md → Deploy Latest Commit

---

## 4. Backup y restauración

### PostgreSQL

```bash
pg_dump "$DATABASE_URL" -Fc -f backup_$(date +%Y%m%d).dump
```

Restauración:

```bash
pg_restore -d hospital_santa_fe backup_YYYYMMDD.dump
```

### Adjuntos

Copiar carpeta completa:

```text
{PREADMISSION_UPLOAD_DIR}/
  └── {preadmissionId}/
        ├── cedulaimagen.jpeg
        ├── ordenimagen.pdf
        └── ...
```

**Incluir adjuntos en backup diario.** Sin ellos, Cellbyte recibe `cedulaimagen` vacío aunque la BD tenga ruta.

---

## 5. Incidentes frecuentes

### 401 Unauthorized en API staff

| Causa | Solución |
|-------|----------|
| Token expirado (30 min) | Re-login |
| Sin header `Authorization: Bearer` | Agregar token |
| Permiso insuficiente | Revisar matriz en `/admin/permissions` |

### CORS / API no responde

| Causa | Solución |
|-------|----------|
| `FRONTEND_URL` incorrecta | Igualar URL real del frontend |
| `API_URL` mal en frontend | Apuntar al backend interno |
| Solo frontend desplegado | Crear segundo servicio backend |

### Adjunto 404

| Causa | Solución |
|-------|----------|
| Archivo perdido en redeploy | Volumen persistente + re-subir adjunto |
| Ruta en BD sin archivo | Ver `warnings` en `cellbyte-payload` |

**Railway:** montar volumen en `/app/backend/uploads/preadmissions` o definir `PREADMISSION_UPLOAD_DIR`.

### Cellbyte falla / skipped

| Síntoma | Acción |
|---------|--------|
| `skipped: true` en logs | Falta `CELLBYTE_BASE_URL` |
| Timeout / ECONNREFUSED | Backend no alcanza IP hospital; usar VPN o backend on-prem |
| Auth HTTP 401 | Revisar `CELLBYTE_USERNAME` / `CELLBYTE_PASSWORD` |
| Imagen vacía en JSON | Ver adjunto 404 arriba |

Diagnóstico:

```http
GET /api/health/cellbyte          # público
GET /api/integrations/cellbyte/connectivity   # JWT + review_preadmissions
```

Consultar bitácora:

```sql
SELECT id, preadmissionId, success, errorMessage, attempt, createdAt
FROM integration_logs
WHERE integration = 'cellbyte'
ORDER BY createdAt DESC
LIMIT 20;
```

### Correos no llegan

1. Verificar `SMTP_*` y `NODE_ENV=production`
2. Google Workspace: contraseña de **aplicación**, no clave personal
3. Guía: `docs/GUIA_SMTP_GOOGLE_WORKSPACE.md`

### Work-list 500 / paginación

- Query params `skip` y `limit` deben ser numéricos
- Ver logs backend por errores TypeORM

### Frontend build falla

- Revisar tipos TypeScript (`npm run build` local)
- Error `duplicate attribute` en JSX → corregir props duplicados

---

## 6. Logs y monitoreo

| Componente | Dónde ver logs |
|------------|----------------|
| Railway | Dashboard → servicio → Deployments → View logs |
| NestJS | stdout del proceso backend |
| Next.js | stdout del proceso frontend |
| PostgreSQL | Logs del servicio BD |

Al iniciar backend debe aparecer:

```text
Adjuntos de preadmisión: /ruta/absoluta
```

Confirme que la ruta apunta al volumen persistente.

---

## 7. Escalamiento

| Nivel | Responsable | Acciones |
|-------|-------------|----------|
| N1 | Recepción / mesa ayuda | Reinicio navegador, re-login, verificar conectividad |
| N2 | TI hospital | Variables env, redeploy, SMTP, volumen adjuntos |
| N3 | Proveedor desarrollo | Bugs, integración Cellbyte, parches código |

---

## 8. Checklist post-incidente

- [ ] Causa raíz documentada
- [ ] Backup verificado
- [ ] Variables corregidas
- [ ] Prueba smoke: login staff, preadmisión test, adjunto descargable
- [ ] Cellbyte connectivity OK (si aplica)

---

*Documento de entrega — Hospital Santa Fe Panamá*
