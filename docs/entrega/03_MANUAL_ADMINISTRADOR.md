# Manual de administrador
## Plataforma Hospital Santa Fe

**Versión:** 1.0 · **Mayo 2026**

---

## 1. Acceso

**Ruta:** `/admin` (solo rol `admin`)

Subsecciones:

| Ruta | Función |
|------|---------|
| `/admin/users` | Usuarios staff |
| `/admin/permissions` | Matriz de permisos por rol |
| `/admin/ticket-types` | Tipos de ticket / servicios |

---

## 2. Gestión de usuarios

**Permiso API:** `manage_users`

### Crear usuario staff

| Campo | Reglas |
|-------|--------|
| Email | Único, formato válido |
| Contraseña | Mín. 8 caracteres, alfanumérica, al menos una mayúscula |
| Nombre completo | Solo letras, espacios, apóstrofes y guiones (opcional) |
| Rol | Ver tabla de roles abajo |

### Editar / desactivar

- Cambiar nombre, rol o estado activo/inactivo.
- **Eliminar:** acción irreversible; confirmar antes.

### Roles disponibles

| Código | Etiqueta |
|--------|----------|
| `anfitrion` | Anfitrión |
| `oficial_admision` | Oficial de Admisión |
| `reception` | Recepción |
| `supervisor` | Supervisor |
| `laboratorio` | Laboratorio |
| `radiologia` | Radiología |
| `auditor` | Auditor |
| `technician` | Técnico |
| `admin` | Administrador |
| `patient` | Paciente (solo registro público) |

El rol **`admin`** tiene todos los permisos automáticamente.

---

## 3. Matriz de permisos

**Permiso API:** `manage_role_permissions`

### Permisos configurables

| Clave | Descripción |
|-------|-------------|
| `view_host_work_list` | Ver lista de llegadas |
| `confirm_arrival` | Confirmar llegada |
| `activate_ticket` | Activar ticket de admisión |
| `staff_check_in` | Check-in por QR |
| `staff_call_ticket` | Llamar ticket |
| `staff_transfer_ticket` | Transferir ticket |
| `staff_complete_ticket` | Finalizar ticket |
| `view_monitor` | Ver monitor |
| `view_reports` | Consultar reportes |
| `export_reports` | Exportar reportes |
| `review_preadmissions` | Revisar preadmisiones / Cellbyte |
| `manage_ticket_types` | Gestionar tipos de ticket |
| `manage_role_permissions` | Gestionar permisos |
| `manage_users` | Gestionar usuarios |

### Operaciones

1. Seleccione rol en la matriz.
2. Active/desactive permisos.
3. Guarde cambios.
4. Puede **agregar roles** configurables o desactivarlos (`isActive`).

Los cambios aplican en el siguiente inicio de sesión del usuario (token JWT vigente hasta 30 min).

---

## 4. Tipos de ticket (servicios)

**Permiso API:** `manage_ticket_types`

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre visible |
| `code` | Código interno |
| `area` | Área (ADM, RAD, LAB, etc.) |
| `ticketPrefix` | Prefijo del número (ej. A, R, L) |
| `priorityLevel` | 1–3 |
| `estimatedTime` | Minutos estimados |
| `isActive` | Visible en kiosco/staff |

Los servicios inactivos no aparecen en kiosco ni en creación de turnos.

---

## 5. Tareas de mantenimiento recomendadas

| Frecuencia | Tarea |
|------------|-------|
| Mensual | Revisar usuarios inactivos |
| Trimestral | Auditar matriz de permisos |
| Al incorporar personal | Crear usuario con rol mínimo necesario |
| Producción | Cambiar contraseñas demo (`admin123`, etc.) |

---

## 6. Variables críticas (TI)

El administrador funcional no configura el servidor, pero debe coordinar con TI:

- SMTP (correos de confirmación y verificación)
- Volumen persistente para adjuntos (`PREADMISSION_UPLOAD_DIR`)
- Cellbyte (`CELLBYTE_*`)
- `JWT_SECRET` y `FRONTEND_URL`

Ver [Runbook](./05_RUNBOOK_OPERACION.md) e [Inventario de secretos](./11_INVENTARIO_SECRETOS.md).

---

*Documento de entrega — Hospital Santa Fe Panamá*
