# Propuesta económica – Alineación Preadmision.md y requisitos.pdf (TE Panamá)

## Alcance del trabajo

Se alineó la plataforma con **Preadmision.md** (febrero 2026) y, en una segunda oleada, con el **requisitos.pdf** (marzo 2026): flujo de llegadas / anfitrión, reglas de seguro y adjuntos, integración hacia Cellbyte (stub con bitácora), reportes ampliados por estado de llegada y parser del QR de cédula según formato práctico del TE (ver comentarios técnicos en código).

La propuesta económica sirve para **facturar lo ya entregado** y para **fases opcionales** que siguen abiertas.

---

## 1. Cambios implementados (entregables)

### 1.1 Preadmisión sin autenticación (Preadmision.md)
- **Backend**: `POST /api/preadmission/public`; `patientId` opcional; búsqueda por cédula pública.
- **Frontend**: `/preadmission` sin cuenta; catálogos públicos donde aplica.
- **Orden médica**: opcional según documento.

### 1.2 Roles, agente y tickets (Preadmision.md)
- **Roles ampliados**: Anfitrión, Oficial de Admisión, Laboratorio, Radiología (compatibles con recepción/técnico).
- **Estados del agente**: `AgentState`; `PATCH /api/auth/agent-state`; selector en consola staff.
- **Transferencia**: `POST /api/tickets/:id/transfer` (RAD | LAB | BOTH); estado **transferido** donde aplica.
- **Restricciones**: Operaciones de llamado / atención / transferencia sin rol anfitrión en API (JWT + roles).

### 1.3 Reportes y exportación (ampliado con requisitos.pdf / KPIs)
- **Listado**: `GET /api/reports/preadmissions` con filtros fecha, tipo, documento y **`arrivalState`**.
- **CSV**: export con columnas **`arrivalState`**, `confirmedArrivalAt`, `ticketId`.
- **Resumen**: KPIs de preadmisión en período (totales por estado de llegada, tasa ticket generado, tiempo medio envío → llegada física).
- **Tiempo real**: conteo del día por estado de llegada.
- **Frontend**: pestaña Preadmisiones en `/reports` con filtros y export.
- **Acceso**: ADMIN, SUPERVISOR, AUDITOR (según documento).

### 1.4 Flujo anfitrión y estados de llegada (requisitos.pdf)
- **Modelo**: `PreadmissionArrivalState` (registrado → espera llegada → paciente presente → ticket generado).
- **API**: `GET /preadmission/work-list`, `PATCH /:id/confirm-arrival`, `POST /:id/activate-ticket` (ticket servicio **ADM** vinculado a preadmisión).
- **Frontend**: `/host` (lista, confirmar llegada, generar ticket admisión); enlace en layout para roles autorizados.
- **Usuario inicial**: `anfitrion@hospitalsantafe.com` (init-data).
- **Kiosco**: check-in por código actualiza llegada cuando corresponde.

### 1.5 Reglas de seguro, contacto y adjuntos (requisitos.pdf)
- Sin seguro → compañía **PACIENTE PRIVADO** en backend; con seguro → carné obligatorio, certificado opcional; prefijo país (**+507** por defecto) y validaciones de nombres / dirección.
- **QR cédula**: `POST /preadmission/parse-cedula-qr` con parser orientado al formato tabular TE (`|`, TAB, `;`), JSON y variantes documentadas en `parse-cedula-qr.ts`.

### 1.6 Integración Cellbyte (requisitos.pdf – fase técnica inicial)
- **Servicio**: envío JSON a `CELLBYTE_URL` si está configurado; si no, stub con registro en **`integration_logs`** y reintentos.
- **Entidad** `IntegrationLog` y marca `cellbyteSentAt` en preadmisión cuando aplica.

### 1.7 Documentación y análisis
- **ANALISIS_PREADMISION.md** (brechas vs Preadmision.md).
- Este documento y README según evolución del proyecto.

---

## 2. Pendiente u opcional (no cerrado en código o solo parcial)

- **Auditoría operativa completa**: bitácora unificada de tickets (llamados, cambios de estado, usuario, timestamps) más allá de logs de integración Cellbyte.
- **Exportación Excel** (`.xlsx`): misma lógica que CSV; librería tipo `exceljs` y `format=xlsx`.
- **Cellbyte en producción**: URL definitiva, certificados, contrato de payload con el TE/proveedor si difiere del stub; pruebas con ambiente real.
- **Tipos de ticket del documento**: H, PMSF, CEH, T, URG, LR, CTA, OT como servicios/códigos configurables.
- **Prioridad 1/2/3**: motor configurable (sigue el enum actual de prioridad).
- **Audio para llamado** de ticket (TTS o pistas).
- **Regla estricta “no operativos”** en backend (además de la UI).

---

## 3. Propuesta económica (referencial)

Importes **orientativos**; ajustar por contrato, moneda e IVA según aplique.

| Concepto | Descripción | Monto sugerido (USD) |
|----------|-------------|----------------------|
| **Fase 1 – Ajustes documento + alcance PDF (ya realizados)** | Todo lo listado en el apartado 1: Preadmision.md, requisitos.pdf (anfitrión, llegadas, seguro/adjuntos, QR TE, Cellbyte stub/bitácora, reportes/KPIs `arrivalState`, transferencias y endurecimiento de API). | **3 200 – 4 500** |
| **Fase 2 – Auditoría y Excel** | Bitácora operativa de tickets/eventos y export Excel de reportes. | **1 200 – 1 800** |
| **Fase 3 – Tipos de ticket y prioridades** | Códigos configurables y motor prioridad 1/2/3. | **1 000 – 1 500** |
| **Fase 4 – Experiencia y voz** | Audio en llamado, regla estricta no operativos en backend, pulido UX. | **800 – 1 200** |

**Total Fase 1 (entregado, referencia):** 3 200 – 4 500 USD  
**Total Fases 2–4 (opcionales):** 3 000 – 4 500 USD  
**Total proyecto amplio (referencia):** 6 200 – 9 000 USD  

---

## 4. Notas

- **¿Por qué sube el rango de Fase 1?** Respecto a una cotización que solo contemplara Preadmision.md, el trabajo de **requisitos.pdf** añade módulos propios (host, estados de llegada, integración, KPIs, parser QR, reglas de seguro). El nuevo rango refleja ese alcance **ya desarrollado**. Si con el Hospital acordaron un **precio cerrado** anterior, puede mantenerse el importe y usar este texto solo como **memoria de entregables**; si se **reabre** la cotización, este rango sirve de base.
- **Suplemento (alternativa contractual):** si Fase 1 se facturó solo con Preadmision.md, el bloque PDF puede cotizarse aparte como suplemento (referencia **900 – 1 800 USD**) en lugar de mezclar rangos.
- Fases 2–4 siguen siendo opcionales y por separado.
- Mantenimiento, hosting (Railway, PostgreSQL), formación y **horas de acompañamiento Cellbyte/TE** no están incluidos salvo acuerdo explícito.

---

*Documento actualizado: entregables alineados con Preadmision.md, requisitos.pdf y el estado del repositorio Hospital Santa Fe.*
