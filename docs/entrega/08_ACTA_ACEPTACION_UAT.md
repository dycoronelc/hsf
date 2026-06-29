# Acta de aceptación — Pruebas UAT
## Plataforma Hospital Santa Fe

**Versión:** 1.0 · **Mayo 2026**

---

## Datos del acta

| Campo | Valor |
|-------|-------|
| **Proyecto** | Plataforma de gestión de flujo de pacientes + preadmisión digital |
| **Proveedor** | *(completar)* |
| **Hospital** | Hospital Santa Fe Panamá |
| **Representante hospital** | *(nombre, cargo, firma)* |
| **Representante proveedor** | *(nombre, cargo, firma)* |
| **Entorno de prueba** | ☐ DEMO  ☐ Staging  ☐ Producción |
| **URL frontend** | |
| **URL backend** | |
| **Fecha inicio UAT** | |
| **Fecha cierre UAT** | |

---

## Criterio de aceptación general

Se considera **aceptado** el entregable si **≥ 95%** de casos críticos están en estado ✅ y no hay bloqueantes abiertos sin plan acordado.

---

## Checklist — Preadmisión (paciente)

| # | Caso de prueba | Resultado | Observaciones |
|---|----------------|-----------|---------------|
| P1 | Completar wizard 8 pasos RAD | ☐ OK ☐ FAIL | |
| P2 | Completar wizard 8 pasos LAB | ☐ OK ☐ FAIL | |
| P3 | Verificación correo paso 4 | ☐ OK ☐ FAIL | |
| P4 | Escaneo QR cédula (móvil) | ☐ OK ☐ FAIL | |
| P5 | Validación nombres (rechaza números) | ☐ OK ☐ FAIL | |
| P6 | Validación documento (solo guiones especiales) | ☐ OK ☐ FAIL | |
| P7 | Validación edad (rechaza 1901) | ☐ OK ☐ FAIL | |
| P8 | Adjuntos PNG/JPG/PDF | ☐ OK ☐ FAIL | |
| P9 | Rechazo formatos no permitidos | ☐ OK ☐ FAIL | |
| P10 | Adjuntos persisten al usar Anterior | ☐ OK ☐ FAIL | |
| P11 | Bloqueo duplicado mismo día/servicio | ☐ OK ☐ FAIL | |
| P12 | Correo confirmación + QR final | ☐ OK ☐ FAIL | Requiere SMTP |
| P13 | Descarga adjunto staff (200) | ☐ OK ☐ FAIL | Requiere volumen |

---

## Checklist — Staff

| # | Caso de prueba | Resultado | Observaciones |
|---|----------------|-----------|---------------|
| S1 | Login recepción | ☐ OK ☐ FAIL | |
| S2 | Lista llegadas `/host` | ☐ OK ☐ FAIL | |
| S3 | Confirmar llegada | ☐ OK ☐ FAIL | |
| S4 | Activar ticket ADM | ☐ OK ☐ FAIL | |
| S5 | Consola llamar/finalizar turno | ☐ OK ☐ FAIL | |
| S6 | Monitor muestra llamado | ☐ OK ☐ FAIL | |
| S7 | Kiosco crea turno anónimo | ☐ OK ☐ FAIL | |
| S8 | Check-in QR | ☐ OK ☐ FAIL | |
| S9 | Reportes resumen | ☐ OK ☐ FAIL | |
| S10 | Export CSV preadmisiones | ☐ OK ☐ FAIL | |

---

## Checklist — Administración

| # | Caso de prueba | Resultado | Observaciones |
|---|----------------|-----------|---------------|
| A1 | Crear usuario staff | ☐ OK ☐ FAIL | |
| A2 | Cambiar permisos rol | ☐ OK ☐ FAIL | |
| A3 | CRUD tipo ticket | ☐ OK ☐ FAIL | |
| A4 | Paciente no ve menús admin | ☐ OK ☐ FAIL | |

---

## Checklist — Integraciones

| # | Caso de prueba | Resultado | Observaciones |
|---|----------------|-----------|---------------|
| I1 | SMTP envío verificación | ☐ OK ☐ FAIL ☐ N/A | |
| I2 | Cellbyte connectivity OK | ☐ OK ☐ FAIL ☐ N/A | |
| I3 | Cellbyte payload con base64 imágenes | ☐ OK ☐ FAIL ☐ N/A | |
| I4 | Bitácora `integration_logs` | ☐ OK ☐ FAIL ☐ N/A | |

---

## Checklist — Infraestructura

| # | Caso de prueba | Resultado | Observaciones |
|---|----------------|-----------|---------------|
| INF1 | Backup PostgreSQL ejecutado | ☐ OK ☐ FAIL | |
| INF2 | Backup adjuntos ejecutado | ☐ OK ☐ FAIL | |
| INF3 | Volumen persistente adjuntos | ☐ OK ☐ FAIL | |
| INF4 | HTTPS frontend | ☐ OK ☐ FAIL | |
| INF5 | Contraseñas demo cambiadas | ☐ OK ☐ FAIL | |

---

## Hallazgos abiertos al cierre

| ID | Descripción | Severidad | Compromiso |
|----|-------------|-----------|------------|
| | | | |
| | | | |

---

## Decisión final

☐ **ACEPTADO** — Se autoriza paso a producción / cierre de proyecto  
☐ **ACEPTADO CON OBSERVACIONES** — Ver hallazgos menores arriba  
☐ **RECHAZADO** — Requiere nueva ronda UAT

---

**Firma hospital:** _________________________ **Fecha:** __________

**Firma proveedor:** _________________________ **Fecha:** __________

---

*Documento de entrega — Hospital Santa Fe Panamá*
