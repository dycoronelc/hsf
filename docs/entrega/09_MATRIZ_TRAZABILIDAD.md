# Matriz de trazabilidad
## Requisitos → Módulo → Verificación

**Versión:** 1.0 · **Mayo 2026**  
**Referencia:** `docs/Informe.md`, especificación preadmisión, respuesta QA `docs/RESPUESTA_INFORME_PRUEBAS_HOSPITAL.md`

---

## Leyenda

| Estado | Significado |
|--------|-------------|
| ✅ | Implementado y verificable |
| ⚠️ | Parcial / depende de hospital |
| ❌ | Fuera de alcance |
| 🔄 | Pendiente re-validación UAT |

---

## Preadmisión — requisitos funcionales

| ID | Requisito / hallazgo | Módulo | Implementación | Prueba UAT |
|----|----------------------|--------|----------------|------------|
| RF-01 | Wizard preadmisión RAD/LAB | `/preadmission` | 8 pasos, multipart | P1, P2 |
| RF-02 | Calendario fecha atención | Paso 1 | `DdMmYyyyDateField` | P1 |
| RF-03 | Identificación C/P + búsqueda | Paso 2 | `check-active`, `search` | P11 |
| RF-04 | Escaneo QR cédula | Paso 2 | `CedulaQrCapture`, cámara trasera | P4 |
| RF-05 | Verificación email | Paso 4 | `verify-contact/*` | P3 |
| RF-06 | Adjuntos formatos PNG/JPG/PDF | Paso 7 | MIME + magic bytes | P8, P9 |
| RF-07 | Adjuntos persisten al navegar | Paso 7 | `useRef` + estado | P10 |
| RF-08 | QR confirmación | Paso 8 | `qrCode` + email | P12 |
| RF-09 | Validación teléfono | Pasos 4-5 | `phoneValidation` + backend | Informe ✅ |
| RF-10 | Duplicidad documento | Paso 2 + API | `check-active` | P11 |
| RF-11 | Validación nombres | Pasos 3, 5 | `person-fields` | P5 |
| RF-12 | Validación documento | Paso 2 | Solo letras/números/guiones | P6 |
| RF-13 | Validación edad nacimiento | Paso 3 | Máx. 120 años | P7 |
| RF-14 | Seguro SI/NO | Paso 6 | Reglas compañía/póliza | Informe ✅ |
| RF-15 | Almacenamiento adjuntos disco | Backend | `PreadmissionStorageService` | P13, INF3 |
| RF-16 | Integración Cellbyte | Backend | `CellbyteService` | I2, I3 |

---

## Turnos y operación

| ID | Requisito | Módulo | Implementación | Prueba UAT |
|----|-----------|--------|----------------|------------|
| T-01 | Cola staff unificada | `/staff` | Tickets `creado`+ en cola | S5 |
| T-02 | Monitor público | `/monitor` | API monitor | S6 |
| T-03 | Kiosco anónimo | `/kiosk` | `POST /tickets/kiosk` | S7 |
| T-04 | Check-in QR | Staff | `check-in-by-code` | S8 |
| T-05 | Sincronización multi-dispositivo | API tickets | Sin filtro por dispositivo | Informe ✅ |
| T-06 | Flujo anfitrión | `/host` | arrival states | S2–S4 |

---

## Seguridad y roles

| ID | Requisito | Módulo | Implementación | Prueba UAT |
|----|-----------|--------|----------------|------------|
| SEC-01 | JWT autenticación | `/api/auth/*` | 30 min expiry | S1 |
| SEC-02 | Permisos por rol | `/admin/permissions` | `PermissionsGuard` | A2 |
| SEC-03 | Menús paciente restringidos | `SiteLayout` | `authRoles` | A4 |
| SEC-04 | Recuperación contraseña email | `/reset-password` | SMTP + token 1h | ⚠️ SMTP |

---

## Administración

| ID | Requisito | Módulo | Prueba UAT |
|----|-----------|--------|------------|
| ADM-01 | CRUD usuarios staff | `/admin/users` | A1 |
| ADM-02 | Matriz permisos | `/admin/permissions` | A2 |
| ADM-03 | Tipos ticket | `/admin/ticket-types` | A3 |

---

## Infraestructura / no funcional

| ID | Requisito | Documento | Prueba |
|----|-----------|-----------|--------|
| NF-01 | Despliegue on-prem | INFRAESTRUCTURA | INF1–INF4 |
| NF-02 | Despliegue Railway | RAILWAY_DEPLOY | Deploy |
| NF-03 | Backup BD + adjuntos | Runbook 05 | INF1, INF2 |
| NF-04 | SMTP Google | GUIA_SMTP | I1 |
| NF-05 | Volumen adjuntos | Runbook 05 | INF3 |

---

## Fuera de alcance (trazabilidad explícita)

| ID | Requisito informe | Estado |
|----|-------------------|--------|
| OA-01 | Recuperación SMS | ❌ No implementado |
| OA-02 | HIS/LIS/RIS directo | ❌ Cellbyte como integración |
| OA-03 | Logo nuevo hospital | ⚠️ Pendiente archivo gráfico hospital |
| OA-04 | Catálogo geo 100% INEC | ⚠️ Migraciones parciales; validar BD |

---

## Referencia cruzada documentos

| Tema | Documento entrega |
|------|-------------------|
| Uso paciente | 01 |
| Uso staff | 02 |
| Admin | 03 |
| Alcance | 04 |
| Soporte | 05 |
| Cellbyte | 06 |
| API | 07 |
| Aceptación | 08 |

---

*Documento de entrega — Hospital Santa Fe Panamá*
