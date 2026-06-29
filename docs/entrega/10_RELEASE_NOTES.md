# Release notes
## Plataforma Hospital Santa Fe

**Versión entregada:** 1.0.0  
**Fecha:** Mayo 2026  
**Rama:** `main`

---

## Resumen

Primera entrega operativa de la plataforma de flujo de pacientes con preadmisión digital, turnos, monitor, administración e integración Cellbyte.

---

## Funcionalidades principales

### Preadmisión
- Wizard de 8 pasos (RAD/LAB)
- Verificación de correo electrónico
- Escaneo QR cédula (cámara trasera)
- Adjuntos multipart a disco (PNG, JPG, PDF)
- Validaciones: nombres, documento, edad (máx. 120 años)
- Control duplicados por documento/departamento/fecha
- Flujo anfitrión: llegada → ticket ADM
- Export Cellbyte payload para staff

### Turnos
- Creación paciente y kiosco anónimo
- Check-in QR, llamar, atender, finalizar, transferir
- Monitor público en tiempo real

### Administración
- Usuarios staff, matriz de permisos, tipos de ticket
- Reportes y exportación CSV/Excel

### Integraciones
- SMTP (confirmación, verificación, reset password)
- Cellbyte (auth + pre-admission, reintentos, bitácora)

---

## Cambios técnicos relevantes

| Área | Cambio |
|------|--------|
| Adjuntos | De base64 en PostgreSQL → archivos en `PREADMISSION_UPLOAD_DIR` |
| Cellbyte | Payload base64 para `cedulaimagen`, `ordenimagen`, `ssimagen` |
| Railway | Detección `RAILWAY_VOLUME_MOUNT_PATH`; warnings en cellbyte-payload |
| Validación | Módulo `person-fields` frontend + backend |
| Paginación | Fix work-list (`skip`/`limit` numéricos) |
| Build frontend | Fix atributo JSX duplicado `maxIso` |

---

## Migraciones SQL (`db/migrations/`)

Ejecutar según orden en entorno existente:

| Archivo | Propósito |
|---------|-----------|
| `20260513_drop_legacy_appointments.sql` | Limpieza tabla legacy |
| `20260525_preadmission_attachment_paths.sql` | Comentarios rutas adjuntos |
| `20260525_geo_catalog_gaps.sql` | Catálogo geográfico |
| `20260527_preadmission_host_and_cellbyte.sql` | Host + Cellbyte columns |

---

## Variables nuevas / importantes

- `PREADMISSION_UPLOAD_DIR`
- `RAILWAY_VOLUME_MOUNT_PATH` (auto)
- `CELLBYTE_BASE_URL`, `CELLBYTE_USERNAME`, `CELLBYTE_PASSWORD`
- `API_URL` (frontend runtime)

Ver `.env.example` e [Inventario de secretos](./11_INVENTARIO_SECRETOS.md).

---

## Commits recientes de referencia

| Commit | Descripción |
|--------|-------------|
| `7be6328` | Fix build frontend maxIso duplicado |
| `a59bb7a` | Validaciones person-fields + Cellbyte adjuntos Railway |
| `2299045` | Fix errores backend |
| `05591a3` | Fix listado preadmisiones paginación |

---

## Known issues

1. Adjuntos perdidos si no hay volumen persistente en PaaS
2. Cellbyte inalcanzable desde backend en nube hacia red 192.168.x.x
3. Campo `ssimagen` en Cellbyte sin input dedicado en wizard
4. TypeORM `synchronize: true` — migrar a migraciones en prod estable
5. Logo institucional pendiente de archivo del hospital

---

## Próxima versión sugerida (roadmap)

- [ ] OpenAPI/Swagger documentación interactiva
- [ ] Re-carga adjuntos en preadmisiones existentes
- [ ] Migraciones TypeORM formales (`synchronize: false`)
- [ ] Campo SS en wizard paso 7
- [ ] Endpoint health adjuntos (verificar volumen)

---

*Documento de entrega — Hospital Santa Fe Panamá*
