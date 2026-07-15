# Guía de integración Cellbyte
## Plataforma Hospital Santa Fe

**Versión:** 1.0 · **Mayo 2026**

---

## 1. Objetivo

Enviar datos de preadmisión desde la plataforma hacia el API **Cellbyte** del hospital, incluyendo imágenes en base64 dentro del JSON.

---

## 2. Variables de entorno

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `CELLBYTE_BASE_URL` | `http://192.168.30.41:8080/cbUat` | URL base **sin** `/api/v1/...` |
| `CELLBYTE_USERNAME` | `preadm@hospitalsantafepanama.com` | Usuario auth |
| `CELLBYTE_PASSWORD` | *(secreto)* | Contraseña auth |
| `CELLBYTE_URL` | *(legado)* | URL completa antigua; se deriva base si falta `CELLBYTE_BASE_URL` |

Si `CELLBYTE_BASE_URL` no está definida, el envío se **omite** (skipped) sin error fatal.

---

## 3. Flujo automático

Al crear preadmisión (`POST /api/preadmission/public`):

1. Backend guarda registro y adjuntos en disco.
2. `CellbyteService.sendPreadmission()` en background:
   - POST `{BASE}/api/v1/auth` → token
   - POST `{BASE}/api/v1/pre-admission` con body `{ "json": "<string>" }`
   - Hasta 3 reintentos
3. Bitácora en tabla `integration_logs`.
4. Campo `cellbyteSentAt` solo si envío exitoso.

---

## 4. API externa Cellbyte

### 4.1 Autenticación

```http
POST {CELLBYTE_BASE_URL}/api/v1/auth
Content-Type: application/json

{
  "username": "...",
  "password": "..."
}
```

Respuesta esperada:

```json
{ "token": "eyJ..." }
```

### 4.2 Pre-admisión

```http
POST {CELLBYTE_BASE_URL}/api/v1/pre-admission
Content-Type: application/json
Authorization: Bearer {token}

{
  "json": "{...string JSON escapado...}"
}
```

**Importante:** el body externo es un objeto con clave `json` cuyo valor es un **string** (JSON serializado), no un objeto anidado directo.

---

## 5. Campos del JSON interno

Referencia: `docs/Archivos/ejemplo_json.json`

| Campo | Tipo | Notas |
|-------|------|-------|
| `departamento` | string | RAD / LAB |
| `name1`, `name2`, `apellido1`, `apellido2` | string | |
| `pasaporte` | string | C o P |
| `cedula` | string | **Número** de documento |
| `sexo` | string | M / F |
| `fechanac` | string | DD/MM/YYYY |
| `nacionalidad`, `estadocivil`, `tiposangre` | string | Códigos catálogo |
| `email`, `celular` | string | Celular sin prefijo +507 |
| `provincia1`, `distrito1`, `corregimiento1`, `direccion1` | string | |
| `encasourgencia`, `relacion`, `email3`, `celular3` | string | Emergencia |
| `provincia3`, `distrito3`, `corregimiento3`, `direccion3` | string | |
| `medico` | string | |
| `doblecobertura` | string | SI / NO |
| `compania1`, `poliza1` | string | Vacíos si NO |
| **`cedulaimagen`** | string | **Base64** cédula/pasaporte (obligatorio) |
| **`ordenimagen`** | string | **Base64** orden médica (obligatorio) |
| **`preautorizacion`** | string | **Base64** preautorización (opcional) |
| **`carnetseguro`** | string | **Base64** carné de seguro (si `doblecobertura=SI`) |
| **`certificadoSeguro`** | string | **Base64** certificado de seguro (si `doblecobertura=SI`) |
| **`ssimagen`** | string | **Base64** imagen SS (opcional; sin campo en wizard) |
| `fechapreadmision` | string | DD/MM/YYYY |

Todos los adjuntos aceptan **PNG, JPG o PDF** codificados en base64 (sin prefijo `data:`).

---

## 6. Obtener payload para pruebas (Postman)

### Paso 1 — Login plataforma

```http
POST /api/auth/login
{ "email": "reception@hospitalsantafepanama.com", "password": "..." }
```

### Paso 2 — Exportar payload

```http
GET /api/preadmission/{id}/cellbyte-payload
Authorization: Bearer {access_token}
```

Requiere permiso `review_preadmissions`.

### Respuesta útil

| Campo | Uso |
|-------|-----|
| `payload` | Objeto JSON interno |
| `postmanBody` | **Copiar a Postman** → body Cellbyte |
| `cedula` | Número documento (verificación rápida) |
| `attachmentSizes` | Tamaño base64 por imagen (0 = vacío) |
| `warnings` | Archivo en BD pero no en disco |
| `cellbyte.authUrl` | URL auth |
| `cellbyte.preAdmissionUrl` | URL envío |

### Paso 3 — Postman hacia Cellbyte

1. POST auth → copiar token
2. POST pre-admission con `postmanBody` + Bearer

---

## 7. Diagnóstico

| Endpoint | Auth | Propósito |
|----------|------|-----------|
| `GET /api/health/cellbyte` | No | Ping conectividad |
| `GET /api/integrations/cellbyte/connectivity` | JWT + permiso | Detalle auth/HTTP |

### Errores comunes

| Problema | Causa |
|----------|-------|
| `cedulaimagen` vacío | Archivo no en disco (volumen Railway) |
| Timeout | Backend en nube, Cellbyte en 192.168.x.x |
| HTTP 401 Cellbyte | Credenciales incorrectas |
| Confundir `cedula` y `cedulaimagen` | Uno es número, otro base64 imagen |

---

## 8. Requisitos de infraestructura

- Backend debe **alcanzar** `CELLBYTE_BASE_URL` por red
- Adjuntos deben existir en `PREADMISSION_UPLOAD_DIR` (volumen persistente)
- Timeout envío: 60 s; adjuntos grandes aumentan tiempo

---

*Documento de entrega — Hospital Santa Fe Panamá*
