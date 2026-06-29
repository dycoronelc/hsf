# Alcance funcional entregado
## Plataforma Hospital Santa Fe

**Versión:** 1.0 · **Mayo 2026**

---

## 1. Resumen ejecutivo

Se entrega una plataforma web compuesta por **frontend Next.js 14** y **backend NestJS 10** con **PostgreSQL**, orientada a:

- Preadmisión digital (Radiología y Laboratorio)
- Gestión de turnos y colas
- Monitor público de llamados
- Portal paciente y consola operativa staff
- Administración de usuarios y permisos
- Reportes operativos
- Integración opcional con **Cellbyte**
- Notificaciones por **correo electrónico (SMTP)**

---

## 2. Módulos incluidos

| Módulo | Rutas web | Estado |
|--------|-----------|--------|
| Portal / inicio | `/` | Entregado |
| Preadmisión digital | `/preadmission` | Entregado (8 pasos) |
| Login / registro paciente | `/login`, `/register` | Entregado |
| Recuperación contraseña | `/reset-password` | Entregado (requiere SMTP) |
| Turnos paciente | `/tickets` | Entregado |
| Dashboard | `/dashboard` | Entregado |
| Consola staff | `/staff` | Entregado |
| Lista de llegadas | `/host` | Entregado |
| Monitor | `/monitor` | Entregado |
| Kiosco | `/kiosk` | Entregado |
| Reportes | `/reports` | Entregado |
| Administración | `/admin/*` | Entregado |
| Encuestas | API `/api/surveys` | Entregado (backend) |

---

## 3. Preadmisión — funcionalidades

| Funcionalidad | Detalle |
|---------------|---------|
| Wizard 8 pasos | Área, identificación, datos, contacto, emergencia, seguro, adjuntos, confirmación |
| Verificación email | Código 6 dígitos antes de continuar paso 4 |
| Escaneo QR cédula | Cámara trasera + carga de imagen |
| Validaciones | Nombres (solo letras), documento (letras/números/guiones), edad (máx. 120 años) |
| Duplicados | Una preadmisión activa por documento + departamento + fecha atención |
| Adjuntos | Multipart a disco; PNG, JPG, PDF; máx. 15 MB |
| QR preadmisión | Generado al confirmar |
| Email confirmación | Si SMTP configurado |
| Cellbyte | Envío automático async si `CELLBYTE_*` configurado |
| Flujo anfitrión | Llegada → ticket ADM |

---

## 4. Turnos — funcionalidades

| Funcionalidad | Detalle |
|---------------|---------|
| Creación | Paciente autenticado o kiosco anónimo |
| QR / código | Para check-in |
| Estados | creado → check_in → llamado → en_atencion → finalizado |
| Transferencia | RAD / LAB / BOTH |
| Prioridades | normal, cita, adulto_mayor, embarazo, discapacidad, emergencia |
| Monitor | Cola pública en tiempo real |

---

## 5. Integraciones

| Integración | Incluido | Notas |
|-------------|----------|-------|
| **SMTP** | Sí | Google Workspace u otro relay |
| **Cellbyte** | Sí | Requiere red alcanzable desde el backend |
| **SMS** | No | Recuperación solo por correo |
| **HIS/LIS/RIS nativo** | No | Fuera de alcance; Cellbyte como puente preadmisión |
| **Call center / videollamada** | No | Roadmap futuro |

---

## 6. Fuera de alcance (explícito)

- Aplicación móvil nativa (iOS/Android)
- Facturación y cobros
- Historia clínica electrónica completa
- Recuperación de contraseña por SMS
- Almacenamiento de adjuntos en base64 en PostgreSQL (migrado a disco)
- Persistencia de adjuntos sin volumen de disco en PaaS (responsabilidad infra hospital)
- Envío Cellbyte desde nube hacia API en red `192.168.x.x` sin VPN/túnel

---

## 7. Limitaciones conocidas

| Limitación | Mitigación |
|------------|------------|
| Adjuntos perdidos al redeploy sin volumen | Configurar `PREADMISSION_UPLOAD_DIR` + volumen Railway o disco persistente |
| Cellbyte desde Railway cloud | Desplegar backend en red hospital o VPN |
| `synchronize: true` en TypeORM | Migrar a migraciones SQL en producción estable |
| Campo `ssimagen` en Cellbyte | Soportado en API; no hay campo dedicado en wizard paso 7 |
| JWT 30 min | Usuario debe re-login tras expiración |

---

## 8. Entornos de despliegue documentados

| Entorno | Documentación |
|---------|---------------|
| Desarrollo local | README.md |
| Railway (PaaS) | RAILWAY_DEPLOY.md |
| On-premise / hospital | INFRAESTRUCTURA_DESPLIEGUE_HOSPITAL.md |

---

## 9. Criterios de aceptación sugeridos

Ver [Acta UAT](./08_ACTA_ACEPTACION_UAT.md) y [Matriz de trazabilidad](./09_MATRIZ_TRAZABILIDAD.md).

---

*Documento de entrega — Hospital Santa Fe Panamá*
