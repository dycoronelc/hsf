# Hospital Santa Fe Panamá – Plataforma de Gestión de Flujo de Pacientes + Preadmisión
**Documento de especificación funcional y técnica (insumo para Cursor)**  
**Referencia funcional:** comportamiento similar a *FluyApp* (gestión de colas + reservas/citas + call center/videollamada + satisfacción). citeturn0search0turn0search3turn0search9  
**Contexto Hospital Santa Fe:** sitio institucional y servicios (diagnóstico/laboratorio, etc.). citeturn0search1turn0search4turn0search16  
**Video de referencia:** “FLUYAPP - La App que hace Tu Vida más Fácil”. citeturn0search2  

---

## 0) Objetivos
1. **Reducir tiempos de espera** y congestión en admisión, laboratorio e imagenología mediante un **sistema de colas** omnicanal (web + móvil + kiosko + pantallas).
2. Permitir **reservas/citas** (cuando aplique) y **ticket virtual** para filas.
3. Habilitar **preadmisiones digitales** para pacientes (Laboratorio / Radiología inicialmente) siguiendo la **estructura JSON definida por el hospital**. fileciteturn0file1L1-L20
4. Proveer **tableros operativos** (SLA, tiempos por etapa, saturación por área, desempeño por ventanilla).
5. Integración con sistemas existentes (HIS/EMR, RIS/PACS, LIS, portal de resultados, etc.) en fases.

---

## 1) Alcance (MVP y Fases)

### 1.1 MVP (12–16 semanas sugeridas)
- **Módulo A:** Gestión de colas (turnos) para áreas definidas (ej. Laboratorio, Radiología, Admisión).
- **Módulo B:** Reserva/Citas (si el hospital confirma que aplica para esas áreas).
- **Módulo C:** Preadmisión digital (portal paciente) con validaciones + adjuntos (base64) según PDF/JSON. fileciteturn0file1L1-L20
- **Módulo D:** Consola operativa (recepción/ventanilla) + Pantalla de llamado.
- **Módulo E:** Notificaciones (email y SMS/WhatsApp opcional).
- **Módulo F:** Encuestas de satisfacción post-atención.

### 1.2 Fase 2 (8–12 semanas)
- **Call center / videollamada** (por referencia de FluyApp). citeturn0search0  
- Integración formal con HIS/LIS/RIS (si se aprueba y se proveen APIs).
- Analítica avanzada (predicción de saturación, staff optimization).

### 1.3 Fuera de alcance inicial (a confirmar)
- Historia clínica completa
- Cobros/facturación
- Gestión de inventarios
- Telemedicina clínica completa (más allá de videollamada de soporte/agenda)

---

## 2) Usuarios, Roles y Permisos

### 2.1 Roles externos (pacientes)
- **Paciente (no autenticado):** puede ver información, tomar turno virtual (si se habilita), consultar estatus por código/QR.
- **Paciente autenticado:** gestiona preadmisión, documentos, historial de turnos/citas, notificaciones.

### 2.2 Roles internos
- **Recepción/Admisión:** crea turnos, atiende turnos, reasigna, marca no-show.
- **Toma de muestras / Técnico lab / Técnico radiología:** llama, atiende, marca etapas (en proceso, completado).
- **Supervisor de área:** configura reglas de cola, prioridades, horarios, métricas y reasignaciones.
- **Administrador:** catálogos, servicios, sedes, integraciones, usuarios, permisos, plantillas, branding.
- **Auditor/Calidad:** acceso a reportes, logs y tiempos (sin datos sensibles según reglas).

---

## 3) Mapa de módulos (visión producto)
> El sistema debe parecerse a una solución tipo FluyApp: **colas**, **reservas/calendario**, **call center/videollamada**, **satisfacción**. citeturn0search0turn0search3

1. **Portal Paciente (Web/Móvil)**
2. **Preadmisión (Laboratorio/Radiología)**
3. **Gestión de Turnos (Ticketing)**
4. **Agenda/Citas (opcional según servicio)**
5. **Consola Operativa (Staff)**
6. **Pantallas de Llamado (TV/Displays)**
7. **Notificaciones y Mensajería**
8. **Encuestas / Satisfacción**
9. **Administración y Configuración**
10. **Reportes y Analítica**
11. **Integraciones (HIS/LIS/RIS, Portal resultados, etc.)**

---

# 4) Flujos principales (end-to-end)

## 4.1 Flujo: Turno Virtual (sin cita)
1) Paciente elige **Sede** → **Área** (Laboratorio/Radiología/Admisión) → **Servicio**  
2) Sistema muestra:
   - Tiempo estimado
   - Número de turnos en cola
   - Reglas (prioridad, documentación necesaria)
3) Paciente toma turno → recibe **código** + **QR** + notificación.
4) Al llegar, valida QR en kiosko o recepción (check-in).
5) Staff llama turno → paciente pasa a atención → se marca finalización.
6) Se dispara encuesta.

## 4.2 Flujo: Reserva/Cita (si aplica)
1) Paciente selecciona servicio y fecha/hora (calendario).
2) Confirmación (email/SMS) + recordatorios.
3) En el día de la cita, se genera turno y se encola con prioridad “CITA”.
4) Atención y cierre + encuesta.

## 4.3 Flujo: Preadmisión (Laboratorio/Radiología)
1) Paciente ingresa a **Preadmisión** (web) → selecciona **RAD o LAB**. fileciteturn0file1L1-L7  
2) Completa datos personales y de contacto (según estructura). fileciteturn0file1L1-L20  
3) Adjunta documentos (cédula, orden médica, etc.) en base64. fileciteturn0file1L21-L36  
4) Sistema valida campos obligatorios y formatos (fechas, códigos, etc.).
5) Sistema genera un **expediente de preadmisión** con ID/QR.
6) Personal del hospital revisa/acepta/rechaza (con observaciones).
7) Si aceptado: se genera turno/cita según reglas; si requiere subsanación: paciente recibe lista de faltantes.

---

# 5) Módulo: Portal Paciente (Web/Móvil)

## 5.1 Objetivo
Una experiencia simple para: turnos, citas, estado, notificaciones y preadmisión.

## 5.2 Pantallas mínimas
- Home (servicios, CTA “Tomar turno”, “Agendar”, “Preadmisión”)
- Selección de sede/área/servicio
- Turno generado (QR + instrucciones)
- Mis turnos / Mis citas
- Preadmisión (wizard)
- Historial (preadmisiones y turnos)
- Perfil y contactos (incluye contacto de urgencia)
- Encuesta post-servicio
- Ayuda/FAQ

## 5.3 Consideraciones UI
- Branding alineado al Hospital Santa Fe (colores/estilo web institucional). citeturn0search1  
- Responsivo, accesible, lenguaje claro.
- Soporte multilingüe (opcional): ES/EN.

---

# 6) Módulo: Gestión de Turnos (colas)

## 6.1 Conceptos
- **Sede** → **Área** → **Servicio**  
- **Ticket**: número visible (ej. RAD-102), QR, estado, prioridad.
- **Estados de ticket**:
  - CREADO → CHECK-IN → EN_COLA → LLAMADO → EN_ATENCIÓN → FINALIZADO  
  - NO_SHOW / CANCELADO / DERIVADO

## 6.2 Reglas de prioridad (configurable)
- CITA vs SIN CITA
- Adulto mayor / Embarazo / Discapacidad (si hospital define)
- Emergencia (derivación)
- Reglas por servicio (ej. Radiología vs Lab)

## 6.3 Consola staff (acciones)
- Llamar siguiente
- Llamar ticket específico
- Re-llamar
- Marcar en atención
- Finalizar
- No-show (con tiempo configurable)
- Transferir a otra cola/servicio
- Añadir nota interna

## 6.4 Kiosko (opcional en MVP)
- Check-in por QR
- Impresión de ticket
- Selección rápida de servicio

## 6.5 Pantallas de llamado
- Pantalla TV por área:
  - “Turno llamado” + ventanilla/consultorio
  - Cola y próximos
- Configuración de layout por sede/área

---

# 7) Módulo: Preadmisión (estructura JSON del hospital)

## 7.1 Fuente de verdad del payload
El hospital compartió:
- Un **ejemplo JSON** de request. fileciteturn0file0  
- Un **PDF** con descripción y obligatoriedad. fileciteturn0file1L1-L36  

## 7.2 Campos del JSON (con validaciones)
> Notas:
> - “*” = obligatorio según PDF. fileciteturn0file1L1-L20  
> - En el ejemplo JSON aparecen algunos campos que no están en el PDF (p.ej. `ssimagen`), y en el PDF aparece `fechaprobableatencion` como obligatorio, pero no está en el ejemplo. Esto debe aclararse con TI del hospital. fileciteturn0file0 fileciteturn0file1L21-L36  

### 7.2.1 Identificación y atención
- `departamento` (String, **obligatorio**)  
  - Valores: `RAD` = Radiología, `LAB` = Laboratorio fileciteturn0file1L1-L7  

### 7.2.2 Datos personales
- `name1` (String, *): primer nombre fileciteturn0file1L1-L7  
- `name2` (String): segundo nombre fileciteturn0file1L1-L7  
- `apellido1` (String, *): primer apellido fileciteturn0file1L1-L7  
- `apellido2` (String): segundo apellido fileciteturn0file1L1-L7  
- `pasaporte` (String, *): tipo identificador  
  - `C` = Cédula, `P` = Pasaporte fileciteturn0file1L6-L11  
- `cedula` (String, *): número de cédula/pasaporte fileciteturn0file1L10-L14  
- `sexo` (String, *): `M` o `F` fileciteturn0file1L12-L14  
- `fechanac` (Date, *): **DD/MM/YYYY** fileciteturn0file1L13-L15  
- `nacionalidad` (String, *): código de nacionalidad (lista de BD) fileciteturn0file1L15-L17  
- `estadocivil` (String, *): `ST, CS, DV, UN, SP, VD` fileciteturn0file1L16-L20  
- `tiposangre` (String, *): códigos 1..9 (A+/A-/A1+/AB+/AB-/B+/B-/O+/O-) fileciteturn0file1L18-L25  

### 7.2.3 Contacto del paciente
- `email` (String, *): formato email fileciteturn0file1L18-L20  
- `celular` (String, *): E.164 recomendado (+507...) fileciteturn0file1L18-L20  

### 7.2.4 Dirección del paciente
- `provincia1` (String, *): código (lista BD) fileciteturn0file1L18-L20  
- `distrito1` (String, *): código (lista BD) fileciteturn0file1L18-L20  
- `corregimiento1` (String, *): código (lista BD) fileciteturn0file1L18-L20  
- `direccion1` (String, *): texto libre fileciteturn0file1L18-L20  

### 7.2.5 Contacto en caso de urgencia
- `encasourgencia` (String, *): nombre del contacto fileciteturn0file1L18-L20  
- `relacion` (String, *): relación con paciente fileciteturn0file1L18-L20  
- `email3` (String, *): email contacto fileciteturn0file1L21-L25  
- `celular3` (String, *): celular contacto fileciteturn0file1L21-L25  
- `provincia3`, `distrito3`, `corregimiento3`, `direccion3` (String): dirección contacto (no marcados * en PDF) fileciteturn0file1L21-L25  

### 7.2.6 Datos de atención
- `fechaprobableatencion` (Date, *): **DD/MM/YYYY** (para LAB según PDF) fileciteturn0file1L21-L30  
- `medico` (String): nombre médico (si aplica) fileciteturn0file1L27-L31  

### 7.2.7 Seguros / cobertura
- `doblecobertura` (String, *): `SI/NO` (en ejemplo aparece `NO`) fileciteturn0file0 fileciteturn0file1L27-L33  
- `compania1` (String): aseguradora (si doble cobertura = SI) fileciteturn0file1L27-L33  
- `poliza1` (String): número póliza fileciteturn0file1L27-L33  

### 7.2.8 Clínico
- `diagnostico` (String): texto diagnóstico fileciteturn0file1L27-L33  

### 7.2.9 Adjuntos (base64)
- `cedulaimagen` (String base64, *): documento de identidad fileciteturn0file1L31-L36  
- `ordenimagen` (String base64, *): orden médica fileciteturn0file1L31-L36  
- `preautorizacion` (String base64): preautorización (si aplica) fileciteturn0file1L31-L36  
- `carnetseguro` (String base64): carnet seguro (si aplica) fileciteturn0file1L31-L36  

### 7.2.10 Campos sistema
- `numerocotizacion` (String): número de cotización (si aplica) fileciteturn0file1L31-L36  
- `fechapreadmision` (Date): automático, **DD/MM/YYYY HH24:MI:SS** fileciteturn0file1L31-L36  

### 7.2.11 Campos presentes en el ejemplo pero NO descritos en el PDF
- `ssimagen`, `ordenimagen` (sí), `ssimagen` (no descrito) fileciteturn0file0  
**Acción:** confirmar con TI del hospital si:
- `ssimagen` = foto de seguro social / algo equivalente  
- o si se elimina del payload.

## 7.3 Validaciones recomendadas
- Fechas en formato exacto (DD/MM/YYYY) y `fechapreadmision` con timestamp.
- Base64: tamaño máximo por archivo, tipo MIME permitido (JPG/PNG/PDF), escaneo antivirus.
- Listas: nacionalidad/provincia/distrito/corregimiento deben consumirse de catálogos del hospital.
- Reglas condicionales:
  - Si `doblecobertura=SI` → `compania1` y `poliza1` obligatorios.
  - Si servicio requiere preautorización → `preautorizacion` obligatorio.

## 7.4 UX del wizard de Preadmisión
- Paso 1: Área (RAD/LAB) + fecha probable atención
- Paso 2: Datos personales
- Paso 3: Contacto + Dirección
- Paso 4: Contacto urgencia
- Paso 5: Seguro/Cobertura (condicional)
- Paso 6: Adjuntos
- Paso 7: Confirmación + consentimiento + enviar

---

# 8) Módulo: Administración

## 8.1 Catálogos
- Sedes
- Áreas (Lab, Radiología, Admisión, etc.)
- Servicios (por área)
- Reglas de prioridad y SLA
- Plantillas de notificación
- Encuestas y preguntas
- Usuarios internos y roles

## 8.2 Configuración de colas
- Horarios
- Ventanillas/estaciones
- Capacidad por franja
- Reglas de cita vs walk-in
- Tiempo máximo antes de marcar No-Show

## 8.3 Branding / UI
- Logo, colores, tipografías, favicon
- Textos legales (privacidad, consentimiento)

---

# 9) Reportes y analítica
KPIs por sede/área/servicio:
- Tiempo promedio de espera (check-in → llamado)
- Tiempo promedio de atención (llamado → finalizado)
- Total de tickets por hora/día
- No-shows
- Satisfacción NPS / CSAT
- Saturación por ventanilla
- Heatmap por franjas horarias

---

# 10) Integraciones (diseño)
## 10.1 Sistemas potenciales
- Portal de resultados (se observa un endpoint de autenticación del laboratorio). citeturn0search6  
- Directorio médico/agenda de especialistas (si aplica). citeturn0search18  
- RIS/PACS (imagenología), LIS (laboratorio), HIS/EMR.

## 10.2 Estrategia por fases
- Fase 1: Integración “mínima” por intercambio de preadmisión (API hospital).
- Fase 2: Sincronización de citas y órdenes (si hay APIs).
- Fase 3: Estado de resultados y notificaciones automáticas.

## 10.3 Requerimientos para integraciones
- Especificación API (OpenAPI)
- Autenticación (OAuth2/JWT o API Key)
- Ambientes: QA/Prod
- Mapeo de catálogos (nacionalidad, ubicación, servicios)
- Pruebas end-to-end

---

# 11) Arquitectura recomendada (para implementación)
## 11.1 Frontend
- Web app (React/Next.js) + PWA para móviles
- Panel staff (web) + pantalla TV (web read-only)

## 11.2 Backend
- API (FastAPI / Node)  
- Motor de colas (tabla + reglas + scheduler)  
- Servicio de documentos (base64→obj storage)  
- Servicio de notificaciones (email/SMS/WA)  

## 11.3 Datos
- PostgreSQL (transaccional)
- Redis (colas/tiempos real opcional)
- Object Storage (S3 compatible) para adjuntos
- Auditoría (append-only)

## 11.4 Seguridad
- Roles y permisos
- Cifrado en tránsito y reposo
- Logs y trazabilidad
- Cumplimiento de privacidad (consentimiento y retención de datos)

---

# 12) Criterios de aceptación (ejemplos críticos)
1. Preadmisión no puede enviarse si faltan campos obligatorios marcados * en el PDF. fileciteturn0file1L1-L36  
2. Adjuntos obligatorios (`cedulaimagen`, `ordenimagen`) deben existir y cumplir límites. fileciteturn0file1L31-L36  
3. Ticket virtual debe poder convertirse a check-in por QR.
4. Consola staff debe llamar siguiente turno según prioridad y SLA configurado.
5. Encuesta se envía automáticamente tras “FINALIZADO”.

---

# 13) Prompt maestro para Cursor (generación del proyecto/prototipo)
> Copia y pega este bloque en Cursor como “Project Spec / Requirements”.

## Prompt
Eres un arquitecto y desarrollador senior. Construye el esqueleto de una plataforma web/PWA para “Hospital Santa Fe – Gestión de Colas + Preadmisión”.
Entregables:
1) Arquitectura (carpetas), frontend y backend.
2) Modelos de datos (SQLAlchemy/Prisma).
3) API OpenAPI completa (endpoints).
4) UI (pantallas) con navegación.
5) Validaciones de Preadmisión según PDF.
6) Mocks de integraciones (hospital API) y adaptadores.

Requisitos funcionales:
- Módulos: Portal paciente, Turnos (colas), Citas (opcional), Preadmisión, Staff console, Pantalla de llamados, Notificaciones, Encuestas, Admin, Reportes.
- Preadmisión: implementar exactamente el payload JSON del hospital:
  - departamento RAD/LAB
  - datos personales/contacto/direcciones
  - contacto de urgencia
  - fechaprobableatencion (obligatorio)
  - doblecobertura + aseguradora/póliza (condicional)
  - adjuntos base64: cedulaimagen y ordenimagen obligatorios
  - fechapreadmision automático (timestamp)
- Incluir validaciones, mensajes de error y estados de borrador/enviado.
- Colas: reglas de prioridad, estados de ticket, dashboard operativo.
- Encuestas: NPS/CSAT básica disparada al finalizar atención.

Requisitos técnicos:
- Frontend: Next.js + Tailwind + componentes (tabla, filtros, QR view, wizard).
- Backend: FastAPI + PostgreSQL + Alembic.
- Almacenamiento adjuntos: S3 compatible (usar mock local en dev).
- Auth: JWT + roles.
- Observabilidad: logging estructurado.
- Seguridad: sanitización, límites de upload, CORS.
Genera código inicial, modelos, endpoints y pantallas.

---

## 14) Preguntas abiertas (para cerrar alcance con el hospital)
1. ¿La preadmisión aplica a RAD y LAB ambos? (PDF menciona “Fecha probable… en Laboratorio”). fileciteturn0file1L21-L30  
2. ¿`fechaprobableatencion` debe existir siempre o solo LAB?
3. Confirmar campos no descritos en PDF (ej. `ssimagen`). fileciteturn0file0  
4. ¿Habrá integración con el portal de resultados y/o LIS/RIS? citeturn0search6  
5. ¿Reglas de prioridad (adulto mayor, embarazo, etc.)?
6. Canales de notificación autorizados (email/SMS/WhatsApp).
