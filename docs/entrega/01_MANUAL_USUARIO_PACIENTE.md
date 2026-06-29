# Manual de usuario — Paciente
## Plataforma Hospital Santa Fe

**Versión:** 1.0 · **Mayo 2026**

---

## 1. Introducción

Este manual describe cómo usar el portal web del Hospital Santa Fe para:

- Completar una **preadmisión digital** (Radiología o Laboratorio)
- Crear una **cuenta de paciente** (opcional)
- Gestionar **turnos virtuales**

**URL de acceso:** la proporcionada por el hospital (ej. `https://frontend-production-….up.railway.app` o dominio institucional).

**Navegadores recomendados:** Chrome, Edge, Safari (actualizados). En móvil, use conexión estable para subir documentos.

---

## 2. Preadmisión digital (sin cuenta)

### 2.1 Inicio

1. En la página principal, seleccione **Preadmisión**.
2. No es obligatorio iniciar sesión; puede completar el formulario como invitado.

### 2.2 Pasos del wizard (8 pasos)

| Paso | Contenido | Qué necesita |
|------|-----------|--------------|
| **1. Área y fecha** | Departamento (RAD/LAB) y fecha probable de atención | Fecha en formato DD/MM/YYYY |
| **2. Identificación** | Tipo documento (Cédula C / Pasaporte P), número, búsqueda de datos previos | Puede escanear QR de cédula (cámara trasera) |
| **3. Datos personales** | Nombres, apellidos, fecha nacimiento, sexo, nacionalidad, estado civil, tipo sangre | Solo letras en nombres; edad razonable (máx. 120 años) |
| **4. Contacto y dirección** | Correo (con **verificación**), celular, provincia/distrito/corregimiento, dirección | Código de 6 dígitos enviado al correo |
| **5. Emergencia** | Nombre contacto, relación, correo y celular de emergencia | |
| **6. Seguro** | ¿Mantiene seguro? Compañía, póliza, médico, procedimiento | Si responde NO, se registra como paciente privado |
| **7. Documentos** | Archivos adjuntos | Ver sección 2.3 |
| **8. Confirmación** | Resumen y envío | Recibirá correo con confirmación y código QR |

### 2.3 Documentos adjuntos

| Documento | Obligatorio | Formatos |
|-----------|-------------|----------|
| Imagen de cédula | **Sí** | PNG, JPG, PDF (máx. 15 MB) |
| Orden médica | No | PNG, JPG, PDF |
| Preautorización | No | PNG, JPG, PDF |
| Carnet de seguro | Si tiene seguro | PNG, JPG, PDF |
| Certificado de seguro | Opcional | PNG, JPG, PDF |

**Consejos:**

- Use fotos nítidas, sin reflejos.
- Si regresa con **Anterior** al paso 7, los archivos seleccionados se conservan.
- Solo se permiten letras, números y guiones en el número de documento.

### 2.4 Verificación de correo (paso 4)

1. Ingrese su correo y pulse **Enviar código**.
2. Revise bandeja de entrada (y spam).
3. Ingrese el código de 6 dígitos y confirme.
4. Debe ver el mensaje de correo verificado antes de continuar.

### 2.5 Duplicados

El sistema impide más de una preadmisión **activa** para el mismo documento, departamento y fecha de atención. Si ya existe, verá un mensaje y no podrá enviar otra igual.

### 2.6 Después del envío

- Pantalla de éxito con **código QR** de la preadmisión.
- Correo de confirmación (si SMTP está configurado en el servidor).
- Debe presentarse en el hospital en la fecha indicada.

---

## 3. Cuenta de paciente (opcional)

### 3.1 Registro

Ruta: **Crear cuenta** / `/register`

| Campo | Reglas |
|-------|--------|
| Nombre completo | Solo letras, espacios, apóstrofes y guiones |
| Número de identificación | Letras, números y guiones |
| Fecha de nacimiento | DD/MM/YYYY, no futura, edad máx. 120 años |
| Correo | Válido y único |
| Celular | Obligatorio |
| Contraseña | Mín. 8 caracteres, alfanumérica, al menos una mayúscula |

Puede autocompletar datos escaneando el QR de la cédula.

### 3.2 Inicio de sesión

Ruta: **Iniciar sesión** / `/login`

Con cuenta puede acceder a **Mis Turnos** y al historial vinculado a su usuario.

### 3.3 Recuperación de contraseña

Ruta: enlace desde login → **Olvidé mi contraseña**

Recibirá un enlace por correo (válido 1 hora) si el servidor tiene SMTP configurado.

---

## 4. Turnos virtuales

1. Inicie sesión como paciente.
2. Vaya a **Mis Turnos** → **Nuevo turno**.
3. Seleccione servicio y obtenga número/QR.
4. En el hospital puede hacer **check-in** con el código QR en recepción o kiosco.

---

## 5. Problemas frecuentes

| Problema | Qué hacer |
|----------|-----------|
| No llega código de correo | Revise spam; espere 2 min; use otro correo si persiste |
| Error al subir imagen | Verifique formato PNG/JPG/PDF y tamaño &lt; 15 MB |
| Cámara QR no abre | Permita acceso a cámara; use carga de imagen del QR |
| Fecha de nacimiento rechazada | Use DD/MM/YYYY; no fechas futuras ni muy antiguas |
| Preadmisión duplicada | Cambie fecha, departamento o contacte recepción |

---

## 6. Privacidad

Sus datos se usan para la preadmisión y atención hospitalaria. Los documentos se almacenan de forma segura en el servidor del hospital, no en el navegador.

---

*Documento de entrega — Hospital Santa Fe Panamá*
