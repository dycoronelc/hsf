**PRUEBAS PLATAFORMA DE GESTIÓN** 

Se documentan los hallazgos identificados durante las pruebas funcionales del Sistema de Pre-Admisiones Web del Hospital Santa Fe, específicamente en el módulo de Preadmisión de Pacientes. Su objetivo es comunicar a la Gerencia de IT y al proveedor del sistema las desviaciones detectadas respecto a los requerimientos funcionales definidos, con el fin de facilitar su priorización y corrección. 

## **Resumen** 

De las pruebas realizadas en el módulo de Preadmisión se identificaron aspectos positivos en el diseño y en funcionalidades básicas de registro. Sin embargo, se detectaron hallazgos que impiden la conclusión exitosa del flujo de preadmisión, así como inconsistencias de comportamiento entre plataformas. 

|**Categoría**<br>~~a~~|**Cant.**<br>~~a~~|**Estado General**<br>~~a~~|
|---|---|---|
|Hallazgos Críticos (Fallido / No concluida / No validado)<br>~~a~~|4<br>~~a~~|Fallido<br>~~a~~|
|Hallazgos Moderados (Pendiente / Inconsistente / Parcial)|5|Pendiente|
|Hallazgos Menores (Logo, Datos geográficos)|2|Parcial|
|Funcionalidades Validadas Exitosamente (OK / Validado)|9|Validado|



## **Aspectos Positivos** 

- La interfaz del sistema presenta un diseño moderno, limpio y amigable. 

- El flujo general de registro es intuitivo y accesible para el usuario. 

- Registro de paciente, campos obligatorios y control de duplicados de correo operan correctamente (OK). 

- Inicio de sesión con usuario y contraseña funciona correctamente (OK). 

- Detalle de Preadmisión: calendario interactivo, entrada manual de fecha y validación de formatos — todos OK. 

- Validación de formato de correo electrónico: OK. 

- Validación de fechas de nacimiento inválidas o futuras: Validado. 

- Validación de campos obligatorios antes de continuar: Validado. 

- Seguro y Cobertura: flujo y reglas de obligatoriedad validados correctamente. 

## **Hallazgos Preadmisión** 

Detallo  los  hallazgos  identificados  durante  las  pruebas  funcionales,  organizados  por severidad. Cada hallazgo incluye el componente afectado, el resultado observado, la descripción  del  problema  y  el  requerimiento  de  referencia  según  el  documento  de especificaciones. 

## **PRUEBAS PLATAFORMA DE GESTIÓN** 

## **Importantes** 

- Escaneo con Cámara (Cédula / Pasaporte) **Fallido** 

   - No se activa la cámara trasera del celular para la captura del documento de identidad. Esta funcionalidad es un requerimiento obligatorio del módulo de Registro de Información del Paciente. Sin ella, el flujo de escaneo automático no puede completarse. 

- Persistencia de Registros de Turnos entre Plataformas **Fallido** Los registros de turnos realizados desde laptop no se muestran en la plataforma. Solo  los  generados  desde  celular  son  visibles.  Esto  indica  un  problema  de sincronización o de sesión multiplataforma que afecta la integridad operativa del sistema. 

- Funcionalidad de Preadmisión – Flujo Completo **No concluida** No fue posible completar el proceso de preadmisión de extremo a extremo. Esto impidió validar funcionalidades posteriores, incluyendo la verificación de colisiones de citas, la generación del código QR y la confirmación del registro. 

- Validación de Formato de Número de Teléfono / Celular **Fallido** El sistema no valida correctamente la longitud ni el formato del número de teléfono o celular ingresado por el paciente, incumpliendo las validaciones requeridas. 

- Duplicidad de Documento de Identidad **No validado** No fue posible validar la detección de duplicados en el número de cédula o pasaporte porque el proceso de preadmisión no se completó. Queda pendiente de validación una vez resuelto el flujo completo. 

**PRUEBAS PLATAFORMA DE GESTIÓN** 

## **Moderados** 

- Recuperación de Contraseña **Pendiente** La funcionalidad de recuperación de contraseña (mediante enlace al correo o código SMS) no ha sido implementada o no estaba disponible en el entorno DEMO al momento de las pruebas. Es un requerimiento funcional obligatorio del módulo. 

- Comportamiento Inconsistente: Laptop vs. Celular **Inconsistente** Algunos procesos (turnos, llegadas, funciones de anfitrión) no operan correctamente en laptop, pero sí en celular. Esta inconsistencia de comportamiento multiplataforma dificulta el uso operativo del sistema por parte del personal hospitalario. 

- Opciones / Menús Visibles para el Rol Paciente **Fallido** Se visualizan opciones o secciones en la interfaz que NO deben aparecer para el rol  Paciente.  El  sistema  debe  restringir  la  vista  según  el  rol  de  usuario. Requerimiento: el paciente no debe tener acceso a vistas administrativas ni de gestión. 

- Documentos Adjuntos – Formatos Permitidos **Fallido** El  sistema  acepta  formatos  de  archivo  que  no  están  contemplados  en  los requerimientos  (Referencia  define:  png,  jpg,  pdf).  Debe  implementarse  una restricción estricta de formatos. 

- Documentos Adjuntos – Persistencia al Navegar **Fallido** Al presionar el botón 'Anterior' para regresar en el flujo, los archivos adjuntados no se conservan. El usuario debe volver a adjuntar los documentos, lo que genera fricción y posibles errores en el proceso. 

- Documentos Adjuntos – Control de Archivos Corruptos **Pendiente** No fue posible verificar si el sistema detecta y rechaza archivos corruptos. Esta validación está definida en el RF-06 y debe ser confirmada por el proveedor o habilitada para prueba. 

## **Menores** 

- Cambio de Logo del Hospital **Pendiente** El logo del hospital no ha sido actualizado en la aplicación. Debe reemplazarse por el nuevo logotipo institucional en todas las vistas y pantallas de la plataforma. 

- Datos Geográficos – Provincias y Distritos **Parcial** Se identificaron datos faltantes o incorrectos en el catálogo de divisiones políticoadministrativas de Panamá: Panamá (falta Distrito de Panamá), Chiriquí (falta Gualá), Los Santos (falta Tonosí), Darién (falta Santa Fe), Bocas del Toro (falta Almirante), Colón (verificar Omar Torrijos Herrera). En Comarca Ngäbe-Buglé: faltan Jirondái y Calovébora. No se verificaron corregimientos. 

- Verificación de Colisión de Citas **No validado** 

## **PRUEBAS PLATAFORMA DE GESTIÓN** 

No fue posible validar esta funcionalidad debido a que el flujo de preadmisión no se pudo completar. Queda pendiente de verificación una vez que el flujo esté operativo. 

Estado de Requerimientos evaluados 

|**N°**|**Descripción del Requerimiento**|**Estado**|**Hallazgo Relacionado**|
|---|---|---|---|
|1|Gestión de Cuenta de Paciente|Parcial|Recuperación de contraseña pendiente<br>Opcionesindebidas pararol Paciente|
|2|Detalle de la Preadmisión|Validado|Sin hallazgos. Calendario, entrada manual y<br>validacióndefecha:OK|
|3|Registro Paciente<br>(Escaneo y Manual)|Parcial|Cámara trasera no activa<br>Validación de teléfono fallida<br>Duplicidadnovalidada|
|4|Seguro y Cobertura|Validado|Sin hallazgos. Flujo y reglas de<br>obligatoriedadvalidados|
|5|Documentos Adjuntos|Parcial|Formatos no restringidos<br>Pérdida de archivos al navegar<br>Controlde corruptos sin validar|
|6|Validación y Confirmación del<br>Registro|Pendiente|Sin validar por flujo incompleto|
|7|Generación de Código QR|Pendiente|Sin validar por flujo incompleto|
|8|Reportes y Exportación|Pendiente|Sin validar por flujo incompleto|



## **PRUEBAS PLATAFORMA DE GESTIÓN** 

Se solicita al proveedor atender los siguientes puntos como condición para continuar con las pruebas de aceptación y avanzar hacia el ambiente de producción: 

## **Alta-Inmediato** 

- Corregir  activación  de  cámara  trasera  para  escaneo  de  cédula/pasaporte  en dispositivos móviles. 

   - La cámara trasera debe activarse y capturar correctamente los datos del documento de identidad. 

- Resolver problema de sincronización de registros entre laptop y celular. Los turnos y registros deben ser visibles y consistentes en todos los dispositivos. 

- Garantizar que el flujo completo de preadmisión pueda completarse de extremo a extremo. 

   - El proceso debe concluir con generación de QR y confirmación exitosa del registro. 

- Implementar validación de longitud y formato del número de teléfono/celular. El  sistema  debe  rechazar  números  con  formato  incorrecto  antes  de  permitir continuar. 

- Implementar flujo de recuperación de contraseña (correo y/o SMS). El usuario debe poder recuperar su contraseña por ambos canales. 

- Restringir opciones/vistas que no corresponden al rol Paciente en la interfaz. El rol Paciente solo debe visualizar las secciones y acciones que le corresponden. 

## **Media-Corto plazo** 

- Corregir inconsistencias de comportamiento entre laptop y celular (turnos, llegadas, anfitrión). Todas las funcionalidades deben operar de manera uniforme en ambos dispositivos. 

- Implementar restricción estricta de formatos de archivo permitidos (png, jpg, pdf). El sistema debe rechazar cualquier formato no definido en el RF-06. 

- Corregir la pérdida de archivos adjuntos al navegar hacia atrás en el flujo Los archivos adjuntados deben persistir al presionar 'Anterior' y regresar al paso de documentos. 

- Confirmar o implementar el rechazo de archivos corruptos al momento de adjuntar. El  sistema  debe  detectar  archivos  corruptos  y  mostrar  un  mensaje  de  error apropiado. 

## **PRUEBAS PLATAFORMA DE GESTIÓN** 

## **Baja-Antes de Producción** 

- Actualizar el logotipo del Hospital Santa Fe en todas las pantallas de la aplicación. El nuevo logo institucional debe aparecer en todas las vistas sin excepciones. 

- Completar y verificar el catálogo de provincias, distritos y comarcas de Panamá según los hallazgos identificados. 

   - Todos los registros geográficos deben coincidir con la división político-administrativa oficial de Panamá. 

**Elaborado por:** 

**Nombre Cargo Numero de Empleado** ~~ee~~ José Luis Rodríguez T. Administradora de Sistemas 50250028 

