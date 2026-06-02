# Respuesta formal al Informe de Pruebas Funcionales — Plataforma de Gestión

**Hospital:** Santa Fe Panamá  
**Documento de referencia:** `docs/Informe.md` — *Pruebas Plataforma de Gestión* (Preadmisión de Pacientes)  
**Elaborado por:** Equipo de desarrollo — Plataforma de flujo y preadmisión  
**Destinatario:** José Luis Rodríguez T. — Administradora de Sistemas (50250028) / Gerencia de IT  
**Fecha:** 25 de mayo de 2026  
**Versión de aplicación:** post-correcciones QA (rama actual del repositorio)

---

## 1. Objetivo de este documento

Presentar la **respuesta punto por punto** a los hallazgos documentados en las pruebas funcionales del módulo de Preadmisión, indicando:

- Qué correcciones se **implementaron** en el software.
- Qué ítems requieren **validación conjunta** en el entorno DEMO.
- Qué puntos dependen de **insumos o decisiones del hospital** (logo, SMTP, catálogo oficial, SMS).

El propósito es permitir la **reanudación de las pruebas de aceptación** con criterios claros de verificación.

---

## 2. Resumen ejecutivo

Tras el informe recibido, se ejecutó un ciclo de correcciones técnicas que aborda la mayoría de los hallazgos críticos y moderados. En síntesis:

| Área | Situación tras correcciones |
|------|----------------------------|
| Escaneo QR / cámara trasera | **Corregido** — priorización de cámara trasera y reintento automático |
| Sincronización turnos multi-dispositivo | **Corregido** — visibilidad unificada en colas staff/monitor/kiosk |
| Flujo completo de preadmisión | **Corregido** — validaciones, adjuntos en disco, confirmación y QR |
| Validación de teléfono | **Corregido** — frontend y backend |
| Duplicidad de documento | **Implementado** — verificación al avanzar paso 2 y al crear registro |
| Recuperación de contraseña | **Parcial** — correo operativo con SMTP; SMS fuera de alcance acordado |
| Menús por rol paciente | **Corregido** |
| Adjuntos (formato, persistencia, corruptos) | **Corregido** |
| Logo institucional | **Pendiente hospital** — falta archivo gráfico oficial |
| Catálogo geográfico | **Parcial** — ampliado; requiere carga en BD y validación vs. INEC |

Se recomienda programar una **segunda ronda de pruebas** en DEMO con SMTP configurado y, de ser posible, acceso desde laptop y móvil al mismo entorno.

---

## 3. Matriz de respuesta por hallazgo

### 3.1 Hallazgos importantes (críticos)

| # | Hallazgo del informe | Estado | Respuesta / acción del proveedor |
|---|----------------------|--------|----------------------------------|
| 1 | **Escaneo con cámara (cédula/pasaporte) — Fallido** | ✅ Corregido | El escáner QR prioriza `facingMode: environment` (cámara trasera) y, si la primera restricción falla, **reintenta automáticamente** otras cámaras antes de mostrar error. Botón manual de cambio de cámara disponible. Archivos: `lib/html5QrcodeScan.ts`, `app/components/LiveQrScannerModal.tsx`, `app/components/CedulaQrCapture.tsx`. |
| 2 | **Persistencia de turnos laptop vs. celular — Fallido** | ✅ Corregido | Causa raíz identificada: tickets en estado `creado` no aparecían en cola staff/monitor; kiosk leía campos incorrectos del JSON. Correcciones: cola incluye `creado`; tickets desde anfitrión entran en `check_in`; kiosk usa `ticket_number` / `qr_code`; host actualiza lista cada 15 s. |
| 3 | **Flujo completo preadmisión — No concluida** | ✅ Corregido | Se eliminó el envío de adjuntos en base64 (causa de fallos/timeouts). Archivos van por **multipart** a disco; confirmación por correo y QR al finalizar. Validaciones de teléfono y documento duplicado antes de enviar. **Pendiente:** re-validar en DEMO los RF-06, RF-07 y reportes. |
| 4 | **Validación teléfono/celular — Fallido** | ✅ Corregido | Reglas por prefijo: Panamá (+507) 7–8 dígitos; Costa Rica 8; Colombia 10; USA/CAN 10. Validación en pasos 4 y 5 (frontend) y al crear preadmisión (backend). |
| 5 | **Duplicidad documento — No validado** | ✅ Listo para validar | Endpoint `GET /api/preadmission/check-active?cedula=&pasaporte=` y bloqueo en backend si existe preadmisión activa (distinta de `RECHAZADO`). Mensaje al usuario en paso 2. |

### 3.2 Hallazgos moderados

| # | Hallazgo del informe | Estado | Respuesta / acción del proveedor |
|---|----------------------|--------|----------------------------------|
| 6 | **Recuperación de contraseña — Pendiente** | ⚠️ Parcial | Flujo UI + API ya existían; se conectó **envío real por correo** (`POST /api/auth/forgot-password` → SMTP). Enlace válido 1 hora. **SMS:** no implementado — ver sección 5 (alcance acordado). Requiere `SMTP_*` y `APP_BASE_URL` en DEMO. |
| 7 | **Laptop vs. celular (turnos, llegadas, anfitrión) — Inconsistente** | ✅ Corregido | Mismas correcciones del ítem 2; polling en pantalla de anfitrión; comportamiento uniforme en API (sin filtros por dispositivo). |
| 8 | **Menús visibles para rol Paciente — Fallido** | ✅ Corregido | Paciente ve solo **Inicio, Preadmisión, Mis Turnos**. Monitor, Consola Staff, Llegadas y Administración ocultos en navegación y dashboard. Archivos: `app/components/SiteLayout.tsx`, `app/dashboard/page.tsx`, `lib/authRoles.ts`. |
| 9 | **Adjuntos — formatos no permitidos — Fallido** | ✅ Corregido | Solo **PNG, JPG, PDF** (se eliminó WEBP y otros). Validación frontend y backend. |
| 10 | **Adjuntos — pérdida al navegar — Fallido** | ✅ Corregido | Archivos conservados en memoria (`useRef` + estado); resumen visible en paso 8; indicador de nombre de archivo al regresar al paso 7. |
| 11 | **Adjuntos — archivos corruptos — Pendiente** | ✅ Corregido | Validación de **magic bytes** (firma PDF/PNG/JPEG), rechazo de archivos vacíos y de MIME incoherente con contenido. Mensaje de error al usuario. |

### 3.3 Hallazgos menores

| # | Hallazgo del informe | Estado | Respuesta / acción del proveedor |
|---|----------------------|--------|----------------------------------|
| 12 | **Logo del hospital — Pendiente** | ⏳ Pendiente hospital | Se unificó componente `HospitalLogo` en pantallas principales. **Falta** que TI entregue el archivo del **nuevo logotipo institucional** para reemplazar `public/logo-hospital-santa-fe.svg`. |
| 13 | **Datos geográficos — Parcial** | ⚠️ Parcial | Se añadieron registros faltantes en `ubicacion_geo.csv` y migración `db/migrations/20260525_geo_catalog_gaps.sql` (Gualá, Tonosí, Omar Torrijos Herrera en Colón, Jirondái). Almirante, Distrito Panamá, Santa Fe (Darién) y Calovébora **ya existían** en catálogo previo. Requiere ejecutar `npm run backend:init` o migración SQL en BD DEMO y validar contra fuente oficial INEC. |
| 14 | **Colisión de citas — No validado** | ✅ Listo para validar | La regla de negocio impide **más de una preadmisión activa por documento** (independiente de fecha/departamento). Al completar el flujo, este control puede verificarse en paso 2 y al enviar. |

---

## 4. Actualización del estado de requerimientos (RF)

| N° | Requerimiento | Estado informe | Estado actual (proveedor) | Notas |
|----|---------------|----------------|---------------------------|-------|
| 1 | Gestión de cuenta de paciente | Parcial | **Parcial → casi completo** | Recuperación por **correo** OK con SMTP. SMS no incluido. Menús paciente corregidos. |
| 2 | Detalle de la preadmisión | Validado | **Validado** | Sin cambios requeridos. |
| 3 | Registro paciente (escaneo y manual) | Parcial | **Listo para re-validar** | Cámara trasera, teléfono, duplicidad documento. |
| 4 | Seguro y cobertura | Validado | **Validado** | Sin cambios requeridos. |
| 5 | Documentos adjuntos | Parcial | **Listo para re-validar** | PNG/JPG/PDF, persistencia, corruptos, almacenamiento en disco. |
| 6 | Validación y confirmación del registro | Pendiente | **Listo para re-validar** | Flujo E2E habilitado; correo de confirmación con SMTP. |
| 7 | Generación de código QR | Pendiente | **Listo para re-validar** | QR en pantalla de éxito y en correo de confirmación. |
| 8 | Reportes y exportación | Pendiente | **Sin cambios en este ciclo** | Disponible para staff con permisos; pendiente prueba formal post-flujo. |

---

## 5. Aclaraciones de alcance (SMS y correo)

El informe solicita recuperación de contraseña por **correo y/o SMS**.

En la documentación de aclaraciones del proyecto (`RESPUESTA_ACLARACIONES.md`) y en la implementación vigente:

- **Correo electrónico:** canal principal para verificación de contacto, confirmación de preadmisión y recuperación de contraseña.
- **SMS / WhatsApp:** **excluidos del alcance actual** por decisión funcional y de costos (sin gateway SMS contratado).

Si el hospital requiere SMS como **obligatorio** para aceptación, debe tratarse como **cambio de alcance** (proveedor de mensajería, costos recurrentes y aprobación formal).

---

## 6. Condiciones para re-prueba en DEMO

Antes de la segunda ronda de pruebas, verificar en el entorno DEMO:

| Variable / acción | Propósito |
|-------------------|-----------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Correo verificación, confirmación preadmisión y recuperación de contraseña |
| `APP_BASE_URL` o `FRONTEND_URL` | Enlaces válidos en correos (reset password) |
| `SMTP_SEND_IN_DEV=true` (solo si DEMO = desarrollo) | Permite envío SMTP fuera de `NODE_ENV=production` |
| `PREADMISSION_UPLOAD_DIR` (opcional) | Carpeta persistente para adjuntos; incluir en backup |
| Ejecutar `npm run backend:init` o migraciones SQL | Cargar catálogo geográfico actualizado |
| Permisos escritura en `uploads/preadmissions/` | Almacenamiento de adjuntos |

Guías de referencia: `docs/GUIA_SMTP_GOOGLE_WORKSPACE.md`, `docs/INFRAESTRUCTURA_DESPLIEGUE_HOSPITAL.md`.

---

## 7. Plan de pruebas sugerido (re-aceptación)

Checklist recomendado para Sistemas del hospital:

### Alta prioridad

- [ ] **Móvil:** Escanear QR de cédula con cámara trasera; alternar cámara si el dispositivo tiene varias.
- [ ] **Preadmisión E2E:** Completar 8 pasos; recibir correo de confirmación con QR; verificar registro en BD.
- [ ] **Teléfono:** Intentar avanzar con número inválido (debe bloquear); probar +507 con 8 dígitos válidos.
- [ ] **Documento duplicado:** Segunda preadmisión con misma cédula activa (debe rechazar en paso 2 o al enviar).
- [ ] **Adjuntos:** Subir PNG/JPG/PDF; retroceder desde paso 8 a 7 y confirmar que el archivo sigue listado; intentar WEBP (debe rechazar).
- [ ] **Turnos:** Crear turno desde kiosk (laptop); verificar número y QR; confirmar visibilidad en Consola Staff y Monitor.
- [ ] **Anfitrión:** Confirmar llegada y activar ticket; verificar turno en cola staff.
- [ ] **Rol paciente:** Login paciente — no debe ver Monitor ni consolas administrativas.
- [ ] **Recuperación contraseña:** Solicitar reset; recibir correo; cambiar contraseña con enlace.

### Media / baja prioridad

- [ ] Catálogo geo: seleccionar provincias/distritos reportados (Gualá, Tonosí, Omar Torrijos, Jirondái).
- [ ] Logo: tras entrega de archivo oficial, verificar presencia en login, preadmisión, kiosco y layout general.
- [ ] Reportes: exportación preadmisiones (usuario con permiso `admin` o equivalente).

---

## 8. Solicitud al hospital

Para cerrar los ítems aún abiertos, agradecemos:

1. **Archivo del nuevo logotipo** (SVG o PNG alta resolución) para sustituir `public/logo-hospital-santa-fe.svg`.
2. **Confirmación de SMTP** operativo en DEMO (cuenta `pagos@hospitalsantafepanama.com` o la definida por TI).
3. **Decisión formal** sobre SMS en recuperación de contraseña (mantener solo correo vs. ampliar alcance).
4. **Fuente oficial** del catálogo INEC si se requieren ajustes adicionales de corregimientos.
5. **Agenda de re-prueba** con escenarios laptop + móvil sobre el **mismo entorno DEMO**.

---

## 9. Cierre

Agradecemos el informe detallado de la Administradora de Sistemas. Las correcciones descritas están disponibles en el código fuente del proyecto y listas para despliegue en DEMO.

Quedamos atentos para acompañar la **segunda ronda de pruebas de aceptación** y registrar cualquier observación residual con número de caso, captura de pantalla, dispositivo/navegador y pasos para reproducir.

---

**Contacto técnico:** [completar correo del proveedor / PM del proyecto]  
**Repositorio / documentación:** raíz del proyecto `hospitalsantafe` — carpeta `docs/`

---

*Documento generado en respuesta a `docs/Informe.md`. Mantener sincronizado con cada despliegue a DEMO o producción.*
