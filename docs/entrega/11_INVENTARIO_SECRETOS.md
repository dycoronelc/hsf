# Inventario de secretos y credenciales
## Plataforma Hospital Santa Fe

**Versión:** 1.0 · **Mayo 2026**

> **Este documento NO contiene valores reales.** Solo indica qué secretos existen, dónde configurarlos y quién es responsable.

---

## 1. Principios

- Nunca commitear secretos en Git (`.env` en `.gitignore`)
- Rotar credenciales demo antes de producción
- Usar gestor de secretos del hospital o variables del orquestador (Railway, Azure Key Vault, etc.)
- Acceso mínimo necesario por rol

---

## 2. Inventario

| ID | Secreto / credencial | Variable | Servicio | Responsable | Rotación |
|----|----------------------|----------|----------|-------------|----------|
| S01 | Conexión PostgreSQL | `DATABASE_URL` | Backend | TI hospital | Anual / al cambiar DBA |
| S02 | Firma JWT | `JWT_SECRET` | Backend | TI hospital | Al sospecha compromiso |
| S03 | SMTP usuario | `SMTP_USER` | Backend | TI + correo | Según política Google |
| S04 | SMTP contraseña aplicación | `SMTP_PASS` | Backend | TI + correo | 90 días recomendado |
| S05 | Cellbyte usuario | `CELLBYTE_USERNAME` | Backend | TI + Cellbyte | Según Cellbyte |
| S06 | Cellbyte contraseña | `CELLBYTE_PASSWORD` | Backend | TI + Cellbyte | Según Cellbyte |
| S07 | Usuario admin demo | BD `users` | App | Admin hospital | **Inmediato en prod** |
| S08 | Usuario recepción demo | BD `users` | App | Admin hospital | **Inmediato en prod** |

---

## 3. Variables no secretas pero críticas

| Variable | Tipo | Notas |
|----------|------|-------|
| `FRONTEND_URL` | URL pública | CORS |
| `API_URL` | URL interna | Proxy Next.js |
| `APP_BASE_URL` | URL | Links reset password |
| `PREADMISSION_UPLOAD_DIR` | Ruta disco | No es secreto; sí crítico |
| `CELLBYTE_BASE_URL` | URL interna | Puede ser IP privada |
| `NODE_ENV` | `production` | Habilita correo real |

---

## 4. Ubicación por entorno

### Railway

Project → servicio **backend** → Variables  
Project → servicio **frontend** → Variables  
Project → PostgreSQL → `DATABASE_URL` (referencia)

### On-premise

- Archivo `/etc/hospitalsantafe/backend.env` (permisos 600)
- O variables en systemd unit / Windows Service
- Copia espejo en `backend/.env` si el cwd es `backend/`

---

## 5. Usuarios iniciales (cambiar en producción)

| Email | Rol | Password default |
|-------|-----|------------------|
| admin@hospitalsantafe.com | admin | admin123 |
| reception@hospitalsantafe.com | reception | reception123 |

**Acción obligatoria producción:** cambiar contraseñas o desactivar cuentas demo.

---

## 6. Datos sensibles en reposo

| Dato | Ubicación | Protección recomendada |
|------|-----------|------------------------|
| PII pacientes | PostgreSQL | Cifrado disco, backup cifrado |
| Adjuntos cédula/orden | Volumen disco | Permisos OS, backup |
| Tokens JWT | Cliente (memoria/localStorage) | HTTPS, expiración 30 min |
| Logs integración | `integration_logs` | Sin base64 completo en logs |

---

## 7. Checklist seguridad go-live

- [ ] `JWT_SECRET` generado aleatorio (≥ 32 chars)
- [ ] Passwords demo cambiadas
- [ ] `SMTP_PASS` es contraseña de aplicación Google
- [ ] `.env` no en repositorio
- [ ] HTTPS en frontend
- [ ] PostgreSQL no expuesto a Internet
- [ ] Permisos mínimos en matriz de roles
- [ ] Backup cifrado configurado

---

## 8. Procedimiento de rotación JWT

1. Generar nuevo `JWT_SECRET`
2. Actualizar variable en backend
3. Redeploy backend
4. Todos los usuarios deben re-login (tokens previos invalidados)

---

*Documento de entrega — Hospital Santa Fe Panamá — CONFIDENCIAL (proceso, no valores)*
