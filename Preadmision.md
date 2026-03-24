# **Preadmisiones de pacientes**
# Contenido
[Definición	2](#_toc222558240)

[Objetivos	2](#_toc222558241)

[Responsables	3](#_toc222558242)

[Alcance	3](#_toc222558243)

[Requerimientos Funcionales	3](#_toc222558244)

[1. Registro de Preadmisión – Rol Paciente	3](#_toc222558245)

[2. Detalle de la Preadmisión	3](#_toc222558246)

[3. Registro de Información del Paciente	4](#_toc222558247)

[4. Seguro y Cobertura	5](#_toc222558248)

[5. Datos del Procedimiento	5](#_toc222558249)

[6. Documentos Adjuntos	5](#_toc222558250)

[7. Validación y Confirmación del Registro	6](#_toc222558251)

[8. Generación de Código QR	6](#_toc222558252)

[9. Reportes y Exportación	6](#_toc222558253)

[Gestión de Tickets de Atención	7](#_toc222558254)

[Generación de Tickets	7](#_toc222558255)

[Tipos de Ticket	7](#_toc222558256)

[Configuraciones	7](#_toc222558257)

[Reglas de Prioridad y Atención	8](#_toc222558258)

[Llamado del Paciente	8](#_toc222558259)

[Gestión de Usuarios y Roles	9](#_toc222558260)

[Requerimientos No Funcionales	10](#_toc222558261)

[Seguridad	10](#_toc222558262)

[Auditoría	10](#_toc222558263)

[Rendimiento	10](#_toc222558264)

[Disponibilidad	10](#_toc222558265)

[Usabilidad	11](#_toc222558266)

[Autor(es) de la Estrategia	11](#_toc222558267)

[Fecha de Elaboración	11](#_toc222558268)


# <a name="_toc222558240"></a>**Definición**
El presente documento tiene como finalidad definir los requerimientos funcionales y no funcionales para el desarrollo e implementación de una plataforma digital de preadmisiones de pacientes. La solución estará orientada a optimizar el proceso de admisión, reducir tiempos de espera, mejorar la experiencia del paciente y facilitar la integración con los sistemas clínicos existentes.
# <a name="_toc222558241"></a>**Objetivos** 
Se requiere el desarrollo e implementación de una plataforma digital de preadmisiones que permita a los pacientes registrar anticipadamente su información personal y administrativa, con el propósito de:

- Optimizar el proceso de admisión presencial
- Reducir tiempos de espera
- Mejorar la eficiencia operativa
- Minimizar errores de digitación
- Mejorar la experiencia del paciente en el **Hospital Santa Fe**
# <a name="_toc222558242"></a>**Responsables**
- IT
# <a name="_toc222558243"></a>**Alcance** 
El sistema deberá contemplar como mínimo las siguientes funcionalidades:

- Registro digital de preadmisiones de pacientes
- Generación de código QR único por registro
- Gestión y administración de tickets de atención
- Administración de roles y permisos de usuarios
- Visualización de colas de atención
- Generación de reportes operativos
# <a name="_toc222558244"></a>**Requerimientos Funcionales**
## <a name="_toc222558245"></a>**1. Registro de Preadmisión – Rol Paciente**
El sistema deberá permitir que el paciente registre una preadmisión de forma autónoma, bajo las siguientes condiciones:

- El acceso deberá ser abierto, sin requerir la creación de cuentas ni autenticación previa.
- El sistema deberá validar los campos obligatorios antes de completar el registro.
- El sistema deberá permitir correcciones antes del envío final.
## <a name="_toc222558246"></a>**2. Detalle de la Preadmisión**
El paciente deberá seleccionar:

- Tipo de preadmisión (\*):
  - Laboratorio
  - Radiología
- Fecha de atención (\*):
  - Se deberá mostrar un calendario interactivo.
  - Se deberá permitir la entrada manual de la fecha.
  - El sistema deberá validar formatos de fecha válidos.

## <a name="_toc222558247"></a>**3. Registro de Información del Paciente**
El sistema deberá capturar los siguientes datos:

- Cédula o pasaporte (\*)
- Nombre completo del paciente (\*)
- Fecha de nacimiento (\*)
  - Con calendario interactivo
  - Validación de fechas futuras
- Sexo:
  - F
  - M
- Correo electrónico
- Teléfono / Celular (\*)

**Validaciones Requeridas**

El sistema deberá:

- Validar duplicidad de documento de identidad
- Validar formato de correo electrónico
- Validar longitud y formato del teléfono
- Impedir fechas de nacimiento inválidas
## <a name="_toc222558248"></a>**4. Seguro y Cobertura**
El sistema deberá permitir indicar:

- ¿Mantiene seguro?
  - No
  - Sí → Solicitar:
    - Compañía de seguros
    - Número de póliza

**Reglas**

- Si el paciente selecciona “Sí”, los campos de seguro serán obligatorios.
- El sistema deberá permitir configuraciones futuras de aseguradoras.
## <a name="_toc222558249"></a>**5. Datos del Procedimiento**
El sistema deberá permitir registrar en campos separados y se requiere que sean campos abiertos:

- Nombre del médico
- Procedimiento / estudio a realizar
## <a name="_toc222558250"></a>**6. Documentos Adjuntos**
El sistema deberá permitir adjuntar:

- Cédula (png / jpg / pdf) (\*)
- Carné de seguro (opcional)
- Orden médica (opcional / configurable)
- Aprobaciones (opcional)

**Validaciones**

- Restricción de tamaño de archivos
- Validación de formatos permitidos
- Control de archivos corruptos
## <a name="_toc222558251"></a>**7. Validación y Confirmación del Registro**
El sistema deberá:

- Validar todos los campos obligatorios (\*)
- Garantizar consistencia de datos
- Mostrar confirmación de registro exitoso
- Generar identificador único de preadmisión
## <a name="_toc222558252"></a>**8. Generación de Código QR**
Al finalizar el registro:

- Se deberá generar un **código QR único**
- El QR deberá contener un identificador seguro
- El QR deberá permitir recuperación rápida del registro
- El QR no deberá exponer datos sensibles en texto plano
## <a name="_toc222558253"></a>**9. Reportes y Exportación**
La plataforma deberá permitir:

- Consulta de registros por filtros (fecha, tipo, documento)
- Exportación a:
  - Excel
  - CSV
- Control de acceso a reportes según rol
# <a name="_toc222558254"></a>**Gestión de Tickets de Atención**
## <a name="_toc222558255"></a>**Generación de Tickets**
El sistema deberá:

- Generar tickets automáticamente
- Asignar número de atención único
- Asociar ticket al registro del paciente
## <a name="_toc222558256"></a>**Tipos de Ticket**
El sistema deberá soportar nomenclaturas configurables:

- Hospitalización → H (Número)
- Copago / Ingreso PMSF → PMSF (Número)
- Cirugías / Endoscopias / Hemodinámica → CEH (Número)
- Triage → T (Número)
- Urgencias → URG (Número)
- Laboratorio / Radiología → LR (Número)
- Consulta → CTA (Número)
- Otros servicios → OT (Número)
## <a name="_toc222558257"></a>**Configuraciones**
El sistema deberá permitir:

- Crear nuevos tipos de ticket
- Definir prioridades por tipo
- Activar / desactivar tipos
## <a name="_toc222558258"></a>**Reglas de Prioridad y Atención**
- **Motor de Prioridades**

El sistema deberá manejar prioridades configurables en las cual se pueda agregar los tipos de ticket:

- Prioridad 1 
- Prioridad 2
- Prioridad 3

El sistema deberá garantizar:

- Respeto del orden dentro de la prioridad
- Reasignación automática tras finalizar ticket
- Gestión de colas en tiempo real
## <a name="_toc222558259"></a>**Llamado del Paciente**
- **Funcionalidad de Llamado**

Se requiere que el sistema permita

- Llamar ticket
- Transferir ticket
- Finalizar ticket

El sistema deberá:

- Mostrar ticket en pantalla pública
- Indicar ventanilla / módulo
- Pronunciar ticket mediante audio
- Se requiere que la pantalla del llamado de ticket sea amigable con el usuario que realiza el llamado mostrando:
  - Solicite usuario y contraseña
  - Solicite que el usuario seleccione la ventanilla en la cual van a llamar al ticket.
  - Vista de los estados del usuario
    - En línea (asignación automática)
    - Manual (selección libre)
    - Fuera de línea
    - Almorzando
    - Baño
    - Documentando
  - La vista de los ticket en cola divididos de la siguiente manera:
    - Todos los ticket
    - Ticket con prioridades
  - Opciones de: 
    - Llamar ticket
    - Transferir ticket
      - Estudios de radiología 
      - Estudio de Laboratorio
      - Ambos
    - Finalizar ticket
- Se requiere que cada una de estos puntos sean configurables por el rol de administrador.
## <a name="_toc222558260"></a>**Gestión de Usuarios y Roles**
- **Roles del Sistema**

El sistema deberá soportar agregar y configurar los siguientes usuarios y rol:

- Paciente (No debe pedir el registro en la plataforma)
- Anfitrión
- Oficial de Admisión
- Supervisor
- Administrador
- Laboratorio
- Radiología

Se requiere que la plataforma permita la configuración de permisos.

- **Estados del Agente**

El sistema deberá permitir la configuración de estados:

- En línea (asignación automática)
- Manual (selección libre)
- Fuera de línea
- Almorzando
- Baño
- Documentando

Regla crítica:

En estados no operativos, el sistema **no deberá asignar tickets ni permitir llamados**.
# <a name="_toc222558261"></a>**Requerimientos No Funcionales**
## <a name="_toc222558262"></a>**Seguridad**
El sistema deberá:

- Implementar control de acceso por roles a excepción del rol de paciente
- Proteger datos sensibles
- Registrar eventos en bitácora (auditoría)
- Manejar sesiones seguras
## <a name="_toc222558263"></a>**Auditoría**
El sistema deberá almacenar:

- Creación de registros
- Modificaciones
- Llamados de ticket
- Transferencias
- Inicio y Finalizaciones de ticket
## ` `**<a name="_toc222558264"></a>Rendimiento**
- La generación de tickets deberá ser inmediata
- La actualización de colas deberá ser en tiempo real
## <a name="_toc222558265"></a>**Disponibilidad**
- El sistema deberá operar durante horarios clínicos sin interrupciones
- Deberá contemplarse recuperación ante fallos
## <a name="_toc222558266"></a>**Usabilidad**
- Interfaz intuitiva
- Compatible con kioscos / tablets / PC / Celulares
- Minimizar errores de usuario
# <a name="_toc222558267"></a>**Autor(es) de la Estrategia**

|**Nombre**|**Cargo**|**Numero de Empleado**|
| :- | :- | :- |
|Yariela de León|Administradora de Sistemas|50250009|
# <a name="_toc222558268"></a>**Fecha de Elaboración**
Febrero, 2026




