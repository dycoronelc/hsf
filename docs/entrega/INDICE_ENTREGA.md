# Índice de documentación de entrega
## Plataforma Hospital Santa Fe — Flujo de pacientes y preadmisión digital

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Repositorio:** `hospital-santa-fe-platform`

---

## Propósito

Este índice agrupa la documentación oficial entregada al Hospital Santa Fe Panamá para operación, soporte, capacitación y aceptación del sistema.

---

## Documentos de entrega (`docs/entrega/`)

| # | Documento | Audiencia | Descripción |
|---|-----------|-----------|-------------|
| 01 | [Manual de usuario — Paciente](./01_MANUAL_USUARIO_PACIENTE.md) | Pacientes / acompañantes | Preadmisión, registro, turnos |
| 02 | [Manual de usuario — Staff](./02_MANUAL_USUARIO_STAFF.md) | Recepción, anfitrión, técnicos | Llegadas, turnos, monitor, consola |
| 03 | [Manual de administrador](./03_MANUAL_ADMINISTRADOR.md) | Administrador TI / sistema | Usuarios, permisos, tipos de ticket |
| 04 | [Alcance funcional entregado](./04_ALCANCE_FUNCIONAL.md) | Gerencia, PM, aceptación | Módulos, límites, integraciones |
| 05 | [Runbook de operación y soporte](./05_RUNBOOK_OPERACION.md) | Soporte N1/N2, TI | Incidentes, logs, backup, redeploy |
| 06 | [Guía de integración Cellbyte](./06_GUIA_INTEGRACION_CELLBYTE.md) | TI + proveedor Cellbyte | Auth, payload, pruebas Postman |
| 07 | [Referencia de API REST](./07_REFERENCIA_API.md) | Desarrollo / integraciones | Endpoints, auth, permisos |
| 08 | [Acta de aceptación UAT](./08_ACTA_ACEPTACION_UAT.md) | Gerencia + proveedor | Checklist firmable |
| 09 | [Matriz de trazabilidad](./09_MATRIZ_TRAZABILIDAD.md) | QA / auditoría | Requisito → módulo → prueba |
| 10 | [Release notes](./10_RELEASE_NOTES.md) | TI / PM | Versión entregada y cambios |
| 11 | [Inventario de secretos](./11_INVENTARIO_SECRETOS.md) | TI / seguridad | Credenciales (sin valores) |
| 12 | [Plan de capacitación](./12_PLAN_CAPACITACION.md) | RRHH / capacitación | Sesiones y materiales |
| 13 | [Despliegue on‑prem QA/Prod](./13_DESPLIEGUE_ONPREM_QA_PROD.md) | TI / DevOps | SSH, systemd, nginx, migración desde Railway |
| 14 | [Despliegue Prod — resumen](./14_DESPLIEGUE_PROD_RESUMEN.md) | TI / DevOps | Guía corta prod con lecciones QA y catálogo geo |

---

## Documentos técnicos complementarios (repositorio)

| Documento | Ubicación |
|-----------|-----------|
| Infraestructura y despliegue | [../INFRAESTRUCTURA_DESPLIEGUE_HOSPITAL.md](../INFRAESTRUCTURA_DESPLIEGUE_HOSPITAL.md) |
| Despliegue Railway (PaaS) | [../../RAILWAY_DEPLOY.md](../../RAILWAY_DEPLOY.md) |
| SMTP Google Workspace | [../GUIA_SMTP_GOOGLE_WORKSPACE.md](../GUIA_SMTP_GOOGLE_WORKSPACE.md) |
| Respuesta a pruebas funcionales | [../RESPUESTA_INFORME_PRUEBAS_HOSPITAL.md](../RESPUESTA_INFORME_PRUEBAS_HOSPITAL.md) |
| Informe de pruebas (hospital) | [../Informe.md](../Informe.md) |
| Ejemplo JSON Cellbyte | [../Archivos/ejemplo_json.json](../Archivos/ejemplo_json.json) |
| Arranque desarrollo | [../../README.md](../../README.md) |

---

## Orden sugerido de lectura

1. **Gerencia / aceptación:** 04 → 08 → 09 → 10  
2. **Operación diaria:** 01 → 02 → 12  
3. **TI / infraestructura:** INFRAESTRUCTURA → 05 → 11 → 06  
4. **Mantenimiento:** 07 → README

---

## Contacto

Para evolución del sistema, usar el canal acordado con el proveedor de desarrollo y la Gerencia de IT del hospital.
