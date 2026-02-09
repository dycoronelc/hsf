# Hospital Santa Fe - Plataforma de Gestión de Flujo de Pacientes

Sistema completo de gestión de flujo de pacientes con módulo de preadmisión digital para Hospital Santa Fe Panamá.

## Características Principales

- **Preadmisión Digital**: Wizard completo para preadmisión de Laboratorio y Radiología según estructura JSON del hospital
- **Gestión de Turnos**: Sistema de colas virtuales con códigos QR
- **Pantalla de Llamados**: Monitor en tiempo real para visualizar listas de espera
- **Portal del Paciente**: Interfaz para pacientes para gestionar turnos y preadmisiones
- **Consola Operativa**: Panel para staff para llamar turnos y gestionar estados

## Tecnologías

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- QR Code generation

### Backend
- NestJS
- TypeORM
- PostgreSQL
- JWT Authentication
- TypeScript (compartido con frontend)

## Prerrequisitos

- **Node.js 18+**
- **PostgreSQL** (local o remoto; ver `.env.example` para conexión)

Todos los comandos siguientes se ejecutan desde la **raíz del proyecto** (carpeta donde están `package.json` y la carpeta `backend`).

---

## Iniciar el sistema

### Primera vez (instalación y datos iniciales)

1. Crea un archivo `.env` en la raíz (copia `.env.example`).
2. Configura `DATABASE_URL` apuntando a tu PostgreSQL (por defecto: `postgresql://postgres:postgres@localhost:5432/hospital_santa_fe`).
3. Crea la base de datos si no existe: `createdb hospital_santa_fe` (o desde tu cliente PostgreSQL).
4. Ejecuta:

```bash
npm install
npm run backend:build
npm run backend:init
```

`backend:init` crea las tablas, usuarios iniciales y carga catálogos (nacionalidades, ubicación geográfica).

**Usuarios por defecto:**
- **Administrador**: admin@hospitalsantafe.com / admin123
- **Recepción**: reception@hospitalsantafe.com / reception123

### Modo desarrollo (dos terminales)

**Terminal 1 – Backend (API NestJS):**

```bash
npm run backend:dev
```

- API en **http://localhost:8000**
- Recarga automática al editar código

**Terminal 2 – Frontend (Next.js):**

```bash
npm run dev
```

- Aplicación en **http://localhost:3000**

Con ambos en marcha, el sistema queda listo para usar.

### Comandos disponibles

| Comando | Descripción |
|--------|-------------|
| `npm install` | Instalar dependencias (frontend y backend) |
| `npm run backend:init` | Inicializar base de datos y datos de prueba (solo primera vez) |
| `npm run backend:dev` | Arrancar backend en modo desarrollo |
| `npm run dev` | Arrancar frontend en modo desarrollo |
| `npm run build` | Compilar frontend para producción |
| `npm run start` | Servir frontend compilado (tras `npm run build`) |
| `npm run backend:build` | Compilar backend para producción |
| `npm run backend:start` | Ejecutar backend compilado (tras `npm run backend:build`) |
| `npm run clean` | Borrar caché de build del frontend (`.next`) |
| `npm run lint` | Ejecutar linter del frontend |

## Estructura del Proyecto

```
.
├── app/                    # Frontend Next.js
│   ├── page.tsx           # Página principal
│   ├── login/             # Autenticación
│   ├── preadmission/      # Módulo de preadmisión
│   ├── tickets/           # Gestión de turnos
│   ├── monitor/           # Pantalla de llamados
│   └── dashboard/         # Dashboard del usuario
├── backend/                # API NestJS (Node.js)
│   └── src/
│       ├── main.ts        # Punto de entrada
│       ├── app.module.ts  # Módulo raíz
│       ├── auth/          # Autenticación JWT
│       ├── users/         # Usuarios
│       ├── tickets/       # Turnos
│       ├── appointments/  # Citas
│       ├── preadmission/  # Preadmisiones
│       ├── surveys/       # Encuestas
│       ├── reports/      # Reportes
│       ├── notifications/ # Notificaciones
│       └── ...            # Otros módulos
└── ejemplo_json.json      # Ejemplo de estructura JSON
```

## Módulos Implementados

### 1. Preadmisión
- Wizard de 7 pasos
- Validación completa según PDF
- Carga de documentos en base64
- Estados: borrador, enviado, en revisión, aceptado, rechazado

### 2. Gestión de Turnos
- Creación de tickets virtuales
- Generación de códigos QR
- Estados: creado, check-in, en cola, llamado, en atención, finalizado
- Prioridades: normal, cita, adulto mayor, embarazo, discapacidad, emergencia

### 3. Monitor de Llamados
- Visualización en tiempo real
- Lista de espera por servicio
- Tiempos de espera
- Próximos números

### 4. Autenticación
- Registro e inicio de sesión
- JWT tokens
- Roles: paciente, recepción, técnico, supervisor, admin, auditor

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Usuario actual

### Preadmisión
- `POST /api/preadmission/` - Crear preadmisión
- `GET /api/preadmission/` - Listar preadmisiones
- `GET /api/preadmission/{id}` - Obtener preadmisión
- `PATCH /api/preadmission/{id}/review` - Revisar preadmisión

### Turnos
- `POST /api/tickets/` - Crear turno
- `GET /api/tickets/` - Listar turnos
- `POST /api/tickets/{id}/check-in` - Check-in
- `POST /api/tickets/{id}/call` - Llamar turno
- `POST /api/tickets/{id}/start` - Iniciar atención
- `POST /api/tickets/{id}/complete` - Finalizar atención

### Monitor
- `GET /api/monitor/queue/{service_id}` - Cola de un servicio
- `GET /api/monitor/all-queues` - Todas las colas

## Datos de Referencia

El proyecto incluye archivos CSV con:
- `nacionalidades.csv`: Catálogo de nacionalidades
- `ubicacion_geo.csv`: Catálogo de provincias, distritos y corregimientos

## Vulnerabilidades (npm audit)

Si al ejecutar `npm install` aparecen vulnerabilidades:

- **`npm audit fix`** (sin `--force`): aplica solo correcciones que no cambian versiones mayores. Suele no resolver todas.
- **`npm audit fix --force`**: actualiza dependencias de forma agresiva y puede provocar **cambios incompatibles** (por ejemplo, otra versión de NestJS/Next.js). Úsalo solo si vas a revisar y probar el proyecto tras la actualización.

La mayoría de las que reporta el informe están en dependencias de desarrollo (`@nestjs/cli`, `eslint-config-next`, `sqlite3`/`node-gyp`, etc.) y en entorno local su impacto suele ser bajo. En producción conviene desplegar en un entorno aislado y mantener dependencias actualizadas cuando haya releases que corrijan esas debilidades sin romper la app.

## Configuración

Crea un archivo `.env` en la raíz del proyecto (o `.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Si no existe, el frontend suele tomar por defecto `http://localhost:8000` para la API. La base SQLite se genera en `backend/hospital_santa_fe.db` al ejecutar `npm run backend:init`.

## Próximos Pasos

- [ ] Integración con sistemas HIS/LIS/RIS
- [ ] Configurar SMTP/SMS para notificaciones en producción
- [ ] Call center / videollamada
- [ ] Kiosko físico para check-in

## Licencia

Propiedad de Hospital Santa Fe Panamá
