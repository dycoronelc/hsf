# Manual de usuario — Staff
## Plataforma Hospital Santa Fe

**Versión:** 1.0 · **Mayo 2026**

---

## 1. Roles y accesos

| Rol | Pantallas típicas |
|-----|-------------------|
| **Recepción** | Consola staff, llegadas, preadmisiones |
| **Anfitrión** | Lista de llegadas (`/host`) |
| **Técnico / Laboratorio / Radiología** | Consola staff |
| **Supervisor** | Staff + reportes |
| **Auditor** | Reportes (solo lectura) |

Los menús visibles dependen del **rol** y de los **permisos** asignados por el administrador.

**Usuarios demo (cambiar en producción):**

| Rol | Email | Contraseña inicial |
|-----|-------|-------------------|
| Admin | admin@hospitalsantafe.com | admin123 |
| Recepción | reception@hospitalsantafe.com | reception123 |

---

## 2. Inicio de sesión

1. Abra la URL del frontend.
2. **Iniciar sesión** con correo y contraseña institucional.
3. En el **Dashboard** verá accesos según su rol.

---

## 3. Lista de llegadas (Anfitrión)

**Ruta:** `/host`  
**Permiso:** `view_host_work_list`

### Flujo

```
Preadmisión enviada → espera_llegada → paciente llega → paciente_presente → ticket_generado
```

| Acción | Permiso | Descripción |
|--------|---------|-------------|
| Ver lista | `view_host_work_list` | Preadmisiones por estado de llegada |
| Confirmar llegada | `confirm_arrival` | Marca `paciente_presente` |
| Activar ticket | `activate_ticket` | Crea ticket ADM vinculado |

**Filtros:** estado de llegada, búsqueda por nombre/documento.

La lista se actualiza automáticamente cada ~15 segundos.

---

## 4. Consola operativa (Staff)

**Ruta:** `/staff`  
**Permisos:** `staff_call_ticket`, `staff_complete_ticket`, `staff_transfer_ticket`, `staff_check_in`

### Operaciones con turnos

| Acción | Descripción |
|--------|-------------|
| **Check-in QR** | Escanear o ingresar código → estado `check_in` |
| **Llamar** | Pasa ticket a `llamado` (aparece en monitor) |
| **Iniciar atención** | Estado `en_atencion` |
| **Finalizar** | Estado `finalizado` |
| **Transferir** | A Radiología, Laboratorio o ambos |

### Estado del agente

Indique disponibilidad: en línea, manual, almuerzo, baño, etc. Algunos estados bloquean llamar/transferir turnos.

---

## 5. Monitor de llamados

**Ruta:** `/monitor`  
**Permiso:** `view_monitor` (pantalla también usable en modo público para TV)

- Muestra colas por servicio.
- Ticket actualmente llamado.
- Lista de espera y tiempos.
- Opcional: anuncio por voz del número llamado.

Configure un navegador en pantalla completa en la sala de espera.

---

## 6. Kiosco de turnos

**Ruta:** `/kiosk`

- Uso **público** (sin login).
- El paciente elige servicio y obtiene turno con QR.
- Parámetro opcional: `?sede=` para filtrar sede.

---

## 7. Revisión de preadmisiones

**Permiso:** `review_preadmissions`

Estados de revisión:

| Estado | Significado |
|--------|-------------|
| `enviado` | Recién registrado |
| `en_revision` | En proceso de revisión |
| `aceptado` | Aprobado |
| `rechazado` | Rechazado |
| `requiere_subsanacion` | Paciente debe corregir datos |

Desde la API o herramientas staff puede cambiar estado con observaciones.

### Exportar payload Cellbyte

**Permiso:** `review_preadmissions`

```
GET /api/preadmission/{id}/cellbyte-payload
Authorization: Bearer {token}
```

Devuelve JSON listo para enviar a Cellbyte. Ver [Guía Cellbyte](./06_GUIA_INTEGRACION_CELLBYTE.md).

### Descargar adjuntos

```
GET /api/preadmission/{id}/attachments/{campo}
```

Campos: `cedulaimagen`, `ordenimagen`, `preautorizacion`, `carnetseguro`, `certificadoSeguro`, `ssimagen`.

---

## 8. Reportes

**Ruta:** `/reports`  
**Permisos:** `view_reports`, `export_reports`

- Resumen por periodo
- Tiempo real de colas
- Eficiencia por servicio
- Listado y exportación CSV/Excel de preadmisiones

---

## 9. Buenas prácticas

- Cierre sesión al terminar turno en PC compartida.
- Verifique que el paciente coincida con documento antes de activar ticket.
- Si un adjunto no abre (404), el archivo puede haberse perdido por redeploy sin volumen persistente — solicite al paciente reenviar documento o registre nueva preadmisión según política del hospital.

---

*Documento de entrega — Hospital Santa Fe Panamá*
