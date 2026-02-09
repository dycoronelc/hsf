# Guía de Configuración - Hospital Santa Fe Platform

## Instalación Rápida

### 1. Instalar Dependencias del Frontend

```bash
npm install
```

### 2. Instalar Dependencias (incluye backend)

```bash
npm install
```

### 3. Inicializar Base de Datos

```bash
npm run backend:init
```

Esto creará:
- Usuario admin: `admin@hospitalsantafe.com` / `admin123`
- Usuario recepción: `reception@hospitalsantafe.com` / `reception123`
- Servicios básicos (Laboratorio, Radiología, etc.)

### 4. Ejecutar Aplicación

**Terminal 1 - Backend:**
```bash
npm run backend:dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 5. Acceder a la Aplicación

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Documentación API: http://localhost:8000/docs

## Usuarios de Prueba

### Administrador
- Email: `admin@hospitalsantafe.com`
- Password: `admin123`
- Rol: Administrador

### Recepción
- Email: `reception@hospitalsantafe.com`
- Password: `reception123`
- Rol: Recepción

### Paciente
Puedes registrar un nuevo paciente desde la página de registro.

## Estructura de Archivos Importantes

### Frontend
- `app/page.tsx` - Página principal
- `app/preadmission/page.tsx` - Módulo de preadmisión
- `app/tickets/page.tsx` - Gestión de turnos
- `app/monitor/page.tsx` - Pantalla de llamados
- `app/staff/page.tsx` - Consola operativa

### Backend
- `backend/src/` - Código fuente NestJS
  - `entities/` - Entidades TypeORM (modelos)
  - `*.module.ts` - Módulos NestJS
  - `*.service.ts` - Lógica de negocio
  - `*.controller.ts` - Endpoints de la API
- `backend/src/init-data.ts` - Script de inicialización

## Próximos Pasos

1. Configurar variables de entorno (`.env`)
2. Configurar base de datos PostgreSQL para producción
3. Integrar con sistemas del hospital
4. Configurar notificaciones (email/SMS)

## Solución de Problemas

### Error: "Module not found"
- Asegúrate de haber ejecutado `npm install`

### Error de conexión a la base de datos
- Verifica que el archivo `hospital_santa_fe.db` se haya creado en la raíz del proyecto
- Revisa la configuración en `backend/src/app.module.ts`

### Error de autenticación
- Verifica que el backend esté corriendo en el puerto 8000
- Revisa la variable `NEXT_PUBLIC_API_URL` en `.env`
