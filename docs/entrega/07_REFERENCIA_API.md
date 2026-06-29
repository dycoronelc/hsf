# Referencia de API REST
## Plataforma Hospital Santa Fe

**Base URL:** `{HOST}/api`  
**Autenticación:** JWT Bearer (`Authorization: Bearer {access_token}`) salvo rutas públicas  
**Versión doc:** 1.0 · Mayo 2026

---

## 1. Autenticación

| Método | Ruta | Auth | Body |
|--------|------|------|------|
| POST | `/auth/register` | Público | `{ email, password, fullName?, phone?, nationalId?, birthDate? }` |
| POST | `/auth/login` | Público | `{ email, password }` → `{ access_token, token_type }` |
| POST | `/auth/forgot-password` | Público | `{ email }` |
| POST | `/auth/reset-password` | Público | `{ token, password }` |
| GET | `/auth/me` | JWT | — |
| PATCH | `/auth/agent-state` | JWT | `{ agentState }` |

**Expiración JWT:** 30 minutos.

---

## 2. Salud

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/` | Público |
| GET | `/health` | Público |
| GET | `/health/cellbyte` | Público |

---

## 3. Preadmisión

| Método | Ruta | Auth / Permiso |
|--------|------|----------------|
| GET | `/preadmission/check-active` | Público (query: cedula, pasaporte, departamento, fechaprobableatencion) |
| GET | `/preadmission/search` | Público |
| POST | `/preadmission/public` | Público — **multipart**: `data` (JSON) + archivos |
| POST | `/preadmission/parse-cedula-qr` | Público `{ raw }` |
| POST | `/preadmission/verify-contact/request` | Público |
| POST | `/preadmission/verify-contact/confirm` | Público |
| POST | `/preadmission` | JWT — multipart |
| GET | `/preadmission/work-list` | JWT + `view_host_work_list` |
| GET | `/preadmission` | JWT |
| GET | `/preadmission/:id` | JWT (paciente: solo propias) |
| GET | `/preadmission/:id/attachments/:field` | JWT |
| GET | `/preadmission/:id/cellbyte-payload` | JWT + `review_preadmissions` |
| PATCH | `/preadmission/:id/confirm-arrival` | JWT + `confirm_arrival` |
| POST | `/preadmission/:id/activate-ticket` | JWT + `activate_ticket` |
| PATCH | `/preadmission/:id/review` | JWT + `review_preadmissions` |

### Multipart — campos archivo

`cedulaimagen` (obligatorio), `ordenimagen`, `preautorizacion`, `carnetseguro`, `certificadoSeguro`, `ssimagen`

### Campo `data` (JSON)

Ver `CreatePreadmissionDto` en `backend/src/preadmission/dto/preadmission.dto.ts`

---

## 4. Turnos

| Método | Ruta | Auth / Permiso |
|--------|------|----------------|
| POST | `/tickets/kiosk` | Público |
| POST | `/tickets` | JWT |
| GET | `/tickets` | JWT |
| POST | `/tickets/check-in-by-code` | Público |
| POST | `/tickets/:id/check-in` | Público |
| POST | `/tickets/:id/call` | JWT + `staff_call_ticket` |
| POST | `/tickets/:id/start` | JWT + `staff_call_ticket` |
| POST | `/tickets/:id/complete` | JWT + `staff_complete_ticket` |
| POST | `/tickets/:id/transfer` | JWT + `staff_transfer_ticket` |
| PATCH | `/tickets/:id` | JWT + `staff_check_in` |

---

## 5. Servicios y catálogos

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/services` | Público |
| GET | `/services/:id` | Público |
| GET | `/catalogs/nacionalidades` | Público |
| GET | `/catalogs/provincias` | Público |
| GET | `/catalogs/distritos?provincia=` | Público |
| GET | `/catalogs/corregimientos?distrito=` | Público |

---

## 6. Monitor

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/monitor/queue/:serviceId` | Público |
| GET | `/monitor/all-queues` | Público |
| GET | `/monitor/preadmissions` | Público |

---

## 7. Reportes

Requiere JWT + permisos en cada ruta.

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/reports/summary` | `view_reports` |
| GET | `/reports/realtime` | `view_reports` |
| GET | `/reports/efficiency` | `view_reports` |
| GET | `/reports/service/:serviceId` | `view_reports` |
| GET | `/reports/preadmissions` | `view_reports` |
| GET | `/reports/preadmissions/export` | `export_reports` |

Query común: `startDate`, `endDate`, `format` (csv/xlsx).

---

## 8. Administración

JWT + permisos en todas.

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/admin/permission-catalog` | `manage_role_permissions` |
| GET/PUT | `/admin/role-permissions` | `manage_role_permissions` |
| POST/PATCH/DELETE | `/admin/role-matrix/roles` | `manage_role_permissions` |
| GET/POST | `/admin/ticket-types` | `manage_ticket_types` |
| PATCH/DELETE | `/admin/ticket-types/:id` | `manage_ticket_types` |
| GET/POST | `/admin/users` | `manage_users` |
| PATCH/DELETE | `/admin/users/:id` | `manage_users` |

---

## 9. Integraciones

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/integrations/cellbyte/connectivity` | `review_preadmissions` |

---

## 10. Encuestas y notificaciones

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/surveys` | Público |
| PUT | `/surveys/:id/submit` | Público |
| GET | `/surveys/:id` | Público |
| GET | `/surveys/statistics` | JWT |
| POST/GET | `/notifications` | JWT |

---

## 11. Permisos

El rol `admin` omite verificación de permisos. Otros roles: matriz en BD (`role_permissions`).

Lista completa: [Manual administrador](./03_MANUAL_ADMINISTRADOR.md#3-matriz-de-permisos).

---

## 12. Códigos de error habituales

| HTTP | Significado |
|------|-------------|
| 400 | Validación DTO / regla negocio |
| 401 | Token ausente o inválido |
| 403 | Sin permiso |
| 404 | Recurso no encontrado |
| 409 | Conflicto (email/documento duplicado) |
| 500 | Error servidor — revisar logs |

---

*Documento de entrega — Hospital Santa Fe Panamá*
