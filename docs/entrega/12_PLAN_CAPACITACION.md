# Plan de capacitación
## Plataforma Hospital Santa Fe

**Versión:** 1.0 · **Mayo 2026**

---

## 1. Objetivos

- Capacitar usuarios finales en flujos críticos (preadmisión, turnos, anfitrión)
- Formar administradores en gestión de usuarios y permisos
- Transferir conocimiento operativo a TI (despliegue, soporte, Cellbyte)

---

## 2. Audiencias y sesiones

| Sesión | Duración | Audiencia | Modalidad |
|--------|----------|-----------|-----------|
| **C1 — Paciente / preadmisión** | 45 min | Personal orientación pacientes (opcional) | Presencial + demo móvil |
| **C2 — Recepción y anfitrión** | 2 h | Recepción, anfitriones, admisión | Presencial hands-on |
| **C3 — Consola staff y monitor** | 1.5 h | Técnicos, supervisores área | Presencial |
| **C4 — Administración** | 1 h | Admin sistema, supervisor IT funcional | Presencial |
| **C5 — TI e integraciones** | 2 h | Gerencia IT, soporte N2 | Presencial / remoto |

**Total estimado:** 7–8 horas + material asíncrono.

---

## 3. Contenido por sesión

### C1 — Paciente (opcional)

**Material:** [Manual paciente](./01_MANUAL_USUARIO_PACIENTE.md)

- Recorrido wizard 8 pasos
- Verificación correo y adjuntos
- QR cédula en móvil
- Errores frecuentes

**Ejercicio:** completar preadmisión RAD de prueba.

---

### C2 — Recepción y anfitrión

**Material:** [Manual staff](./02_MANUAL_USUARIO_STAFF.md) §3, §7

- Login y dashboard por rol
- Lista de llegadas: confirmar → activar ticket
- Revisión preadmisiones y estados
- Descarga adjuntos

**Ejercicios:**
1. Confirmar llegada de preadmisión de prueba
2. Activar ticket y verificar en consola staff

---

### C3 — Staff y monitor

**Material:** [Manual staff](./02_MANUAL_USUARIO_STAFF.md) §4–§6

- Llamar, atender, finalizar turno
- Transferencia RAD/LAB
- Check-in QR
- Configurar monitor en TV

**Ejercicio:** simular flujo completo de turno en DEMO.

---

### C4 — Administración

**Material:** [Manual administrador](./03_MANUAL_ADMINISTRADOR.md)

- Crear usuario recepción
- Ajustar permisos rol `anfitrion`
- Crear/desactivar tipo ticket

**Ejercicio:** crear usuario temporal y verificar accesos.

---

### C5 — TI

**Material:** [Runbook](./05_RUNBOOK_OPERACION.md), [Cellbyte](./06_GUIA_INTEGRACION_CELLBYTE.md), [Infraestructura](../INFRAESTRUCTURA_DESPLIEGUE_HOSPITAL.md)

- Variables de entorno y secretos
- Volumen adjuntos Railway / on-prem
- SMTP Google Workspace
- Cellbyte: connectivity + Postman
- Backup BD + archivos
- Incidentes frecuentes

**Ejercicio:** ejecutar checklist INF en [Acta UAT](./08_ACTA_ACEPTACION_UAT.md).

---

## 4. Materiales entregables

| Material | Formato |
|----------|---------|
| Manuales 01–03 | PDF (exportar desde Markdown) |
| Quick reference staff | 1 página impresa |
| URLs DEMO/prod | Tarjeta |
| Credenciales capacitación | Sobre cerrado (no demo prod) |
| Índice entrega | [INDICE_ENTREGA.md](./INDICE_ENTREGA.md) |

---

## 5. Evaluación

| Sesión | Criterio éxito |
|--------|----------------|
| C2 | 100% asistentes completan activar ticket |
| C3 | 100% llaman y finalizan turno en DEMO |
| C4 | Admin crea usuario sin asistencia |
| C5 | TI ejecuta connectivity Cellbyte + backup |

Encuesta satisfacción 1–5 al cierre de cada sesión.

---

## 6. Calendario sugerido

| Día | Actividad |
|-----|-----------|
| Día 1 AM | C5 TI (prep infra) |
| Día 1 PM | C4 Admin |
| Día 2 AM | C2 Recepción/anfitrión |
| Día 2 PM | C3 Staff/monitor |
| Día 3 | UAT guiado + [Acta 08](./08_ACTA_ACEPTACION_UAT.md) |
| Día 4+ | Soporte acompañado (hypercare 2 semanas) |

---

## 7. Soporte post-capacitación

| Periodo | Canal | SLA sugerido |
|---------|-------|--------------|
| Semanas 1–2 | WhatsApp / ticket grupo | 4 h respuesta |
| Mes 1 | Email soporte | 1 día hábil |
| Mes 2+ | Mantenimiento contratado | Según contrato |

---

*Documento de entrega — Hospital Santa Fe Panamá*
