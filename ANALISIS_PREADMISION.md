# Análisis: Preadmision.md vs implementación actual

## 1. Registro de Preadmisión – Rol Paciente

| Requerimiento (doc) | Estado actual | Brecha |
|--------------------|---------------|--------|
| Acceso abierto, sin cuentas ni autenticación | **Requiere login** (redirect a /login) | **CRÍTICO**: La página de preadmisión exige estar autenticado. Debe ser pública. |
| Validar campos obligatorios antes de enviar | Sí (validación en front y DTO) | OK |
| Permitir correcciones antes del envío final | Sí (wizard multi-paso) | OK |

## 2. Detalle de la Preadmisión

| Requerimiento | Estado actual | Brecha |
|---------------|---------------|--------|
| Tipo: Laboratorio / Radiología | departamento RAD/LAB | OK |
| Fecha de atención con calendario + manual | fechaprobableatencion, formato fecha | OK |
| Validar formatos de fecha válidos | dateUtils, validación | OK |

## 3. Registro de Información del Paciente

| Requerimiento | Estado actual | Brecha |
|---------------|---------------|--------|
| Cédula o pasaporte (*) | cedula, pasaporte (C/P) | OK |
| Nombre completo (*) | name1, name2, apellido1, apellido2 | OK |
| Fecha de nacimiento (*), calendario, no futuras | fechanac | OK |
| Sexo F/M | sexo | OK |
| Correo electrónico | email | OK (doc dice opcional en texto pero en validaciones no) |
| Teléfono/Celular (*) | celular | OK |
| Validar duplicidad documento | search por cedula | OK |
| Validar formato email y teléfono | class-validator | OK |

## 4. Seguro y Cobertura

| Requerimiento | Estado actual | Brecha |
|---------------|---------------|--------|
| ¿Mantiene seguro? No / Sí | doblecobertura SI/NO | OK |
| Si Sí: Compañía, Número de póliza | compania1, poliza1 | OK |
| Campos obligatorios si Sí | ValidateIf en DTO | OK |

## 5. Datos del Procedimiento

| Requerimiento | Estado actual | Brecha |
|---------------|---------------|--------|
| Nombre del médico (campo abierto) | medico | OK |
| Procedimiento/estudio (campo abierto) | diagnostico | OK (se usa como procedimiento) |

## 6. Documentos Adjuntos

| Requerimiento | Estado actual | Brecha |
|---------------|---------------|--------|
| Cédula (png/jpg/pdf) (*) | cedulaimagen base64 | OK |
| Carné de seguro (opcional) | carnetseguro | OK |
| Orden médica (opcional/configurable) | ordenimagen **obligatorio en DTO** | **Ajustar**: hacer opcional según documento |
| Aprobaciones (opcional) | preautorizacion | OK |
| Restricción tamaño, formatos, archivos corruptos | Validación en front/back | Revisar límites y mensajes |

## 7–8. Validación, Confirmación, QR

| Requerimiento | Estado actual | Brecha |
|---------------|---------------|--------|
| Validar obligatorios, consistencia | DTO + service | OK |
| Confirmación exitosa, identificador único | status, id, qrCode | OK |
| QR único, identificador seguro, sin datos sensibles | qrCode generado (hex) | OK |

## 9. Reportes y Exportación

| Requerimiento | Estado actual | Brecha |
|---------------|---------------|--------|
| Consulta por filtros (fecha, tipo, documento) | Reports con startDate/endDate | Parcial: filtros por tipo y documento a reforzar |
| Exportación Excel | No implementado | **FALTA** |
| Exportación CSV | No implementado | **FALTA** |
| Control de acceso por rol | Roles en ReportsController | OK |

## Gestión de Tickets

| Requerimiento | Estado actual | Brecha |
|---------------|---------------|--------|
| Generar tickets automáticamente, número único | Sí (ticketNumber) | OK |
| Asociar ticket al registro del paciente | patientId, serviceId | OK |
| Tipos configurables: H, PMSF, CEH, T, URG, LR, CTA, OT | Servicios por code/area | Parcial: códigos actuales LAB, RAD, ADM; agregar tipos doc |
| Crear tipos, prioridades, activar/desactivar | Admin, Service | OK |
| Motor Prioridad 1, 2, 3 | Priority enum distinto (NORMAL, CITA…) | Alinear a Prioridad 1/2/3 o mantener configurable |
| Llamar ticket | call | OK |
| **Transferir ticket** (Radiología, Laboratorio, Ambos) | **No existe** | **FALTA** |
| Finalizar ticket | complete | OK |
| Pantalla pública, ventanilla/módulo | monitor, windowNumber | OK |
| Pronunciar ticket por audio | No | Opcional / mejoras |
| Consola: usuario/contraseña, ventanilla, estados del agente | Ventanilla sí; **estados no** | **FALTA** estados del agente |
| Estados: En línea, Manual, Fuera de línea, Almorzando, Baño, Documentando | No implementado | **FALTA** |
| Vista tickets: Todos / Con prioridades | Filtro por servicio | Parcial |
| No asignar tickets en estados no operativos | No aplicable sin estados | Con estados: implementar regla |

## Gestión de Usuarios y Roles

| Requerimiento (doc) | Estado actual | Brecha |
|---------------------|---------------|--------|
| Paciente (no registro en plataforma) | PATIENT | OK concepto; preadmisión debe ser sin login |
| Anfitrión | No | **Agregar** |
| Oficial de Admisión | RECEPTION | Mapear/nombrar |
| Supervisor | SUPERVISOR | OK |
| Administrador | ADMIN | OK |
| Laboratorio | No (TECHNICIAN genérico) | **Agregar** LAB |
| Radiología | No | **Agregar** RAD |
| Configuración de permisos | Roles guard | OK |
| Estados del agente configurables | No | **FALTA** (ver arriba) |

## Requerimientos No Funcionales

| Requerimiento | Estado actual | Brecha |
|---------------|---------------|--------|
| Control de acceso por roles (excepto paciente) | JwtAuthGuard, RolesGuard | OK |
| Proteger datos sensibles, sesiones seguras | JWT, HTTPS | OK |
| Bitácora (auditoría): creación, modificaciones, llamados, transferencias, inicio/fin ticket | No implementado | **FALTA** módulo de auditoría |
| Rendimiento: tickets inmediatos, colas tiempo real | Polling 3s en staff | OK; opcional WebSocket |
| Usabilidad: intuitiva, kioscos/tablets/PC/celulares | Responsive, kiosk | OK |

---

## Resumen de brechas a abordar

1. **Crítico**: Preadmisión sin autenticación (endpoint público + frontend sin login).
2. **Alto**: Transferir ticket (Radiología, Laboratorio, Ambos).
3. **Alto**: Estados del agente (En línea, Manual, Fuera de línea, Almorzando, Baño, Documentando) y regla de no asignar en no operativos.
4. **Alto**: Roles: Anfitrión, Laboratorio, Radiología; alinear Oficial de Admisión.
5. **Medio**: Orden médica opcional en preadmisión.
6. **Medio**: Exportación reportes a Excel y CSV (preadmisiones/tickets con filtros).
7. **Medio**: Tipos de ticket según documento (H, PMSF, CEH, T, URG, LR, CTA, OT) en datos iniciales/config.
8. **Bajo**: Auditoría (bitácora); audio para llamado (opcional).
