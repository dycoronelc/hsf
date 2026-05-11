# Respuesta a aclaraciones – Plataforma de flujo y preadmisión (Hospital Santa Fe)

Documento elaborado en respuesta a los puntos planteados en `aclaraciones.txt`.

## Marco general

- **Infraestructura**: el despliegue, servidores, base de datos, dominios, certificados SSL, redes y costos recurrentes de cloud u hosting corren **por cuenta del hospital** (o de quien ellos designen). Se entrega la aplicación lista para desplegar, documentación de despliegue y apoyo dentro del alcance de soporte acordado.

- **Soporte post-implementación**: **3 meses** incluidos según lo establecido en propuesta o contrato. Finalizado ese período, el soporte puede **prorrogarse mediante contrato** (mensual, trimestral o anual), con alcance y SLAs definidos en ese anexo.

---

## 1. Acuerdos de nivel de servicio (SLA) y soporte

| Aspecto | Respuesta propuesta |
|--------|---------------------|
| **Tiempos de respuesta** (orientativos durante los 3 meses de soporte incluido) | **Crítica** (caída total o pérdida de datos): primera respuesta en **4 h hábiles**; **Media** (funcionalidad principal degradada): **1 día hábil**; **Baja** (consultas, mejoras menores): **2–3 días hábiles**. Valores a **formalizar por escrito** en el contrato. |
| **Tiempos de resolución** | Dependen de la causa (defecto en código vs. infraestructura del hospital vs. terceros). Objetivo orientativo: incidencias críticas en **24–48 h** si el incidente está en el software entregado y hay acceso al entorno; si la causa es infraestructura o red del hospital, la resolución depende de su equipo o proveedor. |
| **Canales de soporte** | Correo electrónico a bandeja acordada; opcionalmente canal de tickets (correo con asunto estructurado o herramienta que utilice el hospital). |
| **Horarios de atención** | **Lunes a viernes**, horario laboral (a concretar, p. ej. 8:00–18:00, zona horaria Panamá). Fuera de ese horario, solo **mejor esfuerzo**, salvo contrato de guardia o soporte extendido. |
| **Procedimiento de escalamiento** | Nivel 1: recepción de incidencia y triage → Nivel 2: soporte técnico/desarrollo → si aplica, coordinación con el **proveedor de infraestructura del hospital** o con **Cellbyte** cuando el fallo no sea atribuible a la aplicación entregada. |

*SLAs más estrictos (24/7, tiempos más cortos) pueden incluirse en un **contrato de soporte ampliado** posterior a los 3 meses.*

---

## 2. Infraestructura y arquitectura tecnológica

| Aspecto | Respuesta |
|--------|-----------|
| **Esquema de hosting** | **Cloud** es el escenario previsto en la implementación (p. ej. Railway u otro PaaS), con **PostgreSQL**. También puede desplegarse en **VM o servidor del hospital** o esquema **híbrido**, siempre que provean un entorno compatible (Node.js, variables de entorno, base de datos PostgreSQL). |
| **Responsabilidad sobre la infraestructura** | **Hospital**: contratación del proveedor cloud o datacenter, cadena de conexión a la base de datos (`DATABASE_URL` u equivalente), secretos, copias de seguridad de la BD, disponibilidad de red, costos recurrentes y cumplimiento frente a su entorno. **Proveedor de desarrollo**: código de aplicación, configuración documentada y compatibilidad con el stack acordado. |
| **Tecnologías utilizadas** | **Frontend**: Next.js. **Backend**: NestJS (API REST). **Base de datos**: PostgreSQL (TypeORM). Autenticación JWT; integraciones HTTP salientes donde aplique (p. ej. Cellbyte). |
| **Requerimientos técnicos del lado del hospital** | Navegadores actualizados para personal y para pantallas/TV; **HTTPS** en producción; política de usuarios y contraseñas; si hay integraciones externas, reglas de **firewall** hacia los endpoints necesarios; persona o área técnica de contacto para despliegues e incidencias de entorno. |
| **Escalabilidad** | API orientada a stateless + base de datos compartida; la escalabilidad horizontal o vertical depende del **plan del proveedor de infra elegido por el hospital**. |

---

## 3. Seguridad de la información y cumplimiento

| Aspecto | Respuesta |
|--------|-----------|
| **Protección de datos (tránsito)** | **HTTPS/TLS** entre navegador cliente y servidor; las comunicaciones salientes hacia sistemas externos (p. ej. Cellbyte) deben usar HTTPS en producción. |
| **Protección de datos (reposo)** | Depende del **proveedor de almacenamiento y de la base de datos** contratado por el hospital (muchas plataformas cloud ofrecen cifrado en disco). Complementa, pero no sustituye, controles de acceso y buenas prácticas. |
| **Gestión de accesos y autenticación** | Usuarios con roles; tokens JWT; contraseñas almacenadas con hash en servidor. Se recomienda política de contraseñas y no compartir cuentas, gestionada por el hospital. |
| **Cumplimiento normativo** | El hospital define el marco legal y de salud aplicable en Panamá. El proveedor de desarrollo puede implementar **medidas técnicas razonables** (control de acceso, minimización de logs, etc.). **Políticas de privacidad, bases legales y figura de protección de datos** corresponden a la institución. |
| **Sesiones y control de accesos** | JWT con expiración; cierre de sesión en cliente; permisos por rol en API para operaciones sensibles. |

---

## 4. Respaldo de información y recuperación ante desastres

| Aspecto | Respuesta |
|--------|-----------|
| **Políticas de respaldo** | **Responsabilidad principal del hospital** sobre la instancia de PostgreSQL: copias automáticas según el plan del proveedor (snapshots diarios, retención, etc.). |
| **Ubicación de los respaldos** | La define el **proveedor cloud o el centro de datos** del hospital (región, redundancia geográfica si aplica). |
| **Procedimiento de recuperación** | Debe documentarse con el proveedor de la base de datos; el equipo de desarrollo puede asistir en **restauración de esquema o datos** si se dispone de backup compatible y entorno operativo. |
| **RTO / RPO** | Dependen del **SLA del hosting y de la política de backups** del hospital; no pueden fijarse de forma vinculante sin conocer ese proveedor y plan. |
| **Plan de continuidad operativa** | Ante caída prolongada, el hospital puede operar en **modo manual** (registro en soporte físico u otras herramientas) hasta restaurar el servicio digital. |

---

## 5. Integración con sistemas existentes (Cellbyte)

| Aspecto | Respuesta |
|--------|-----------|
| **Alcance de la integración** | Integración **unidireccional** preparada: envío de payload JSON tras eventos de preadmisión, registro en **bitácora** (`integration_logs`), reintentos y configuración mediante **`CELLBYTE_URL`**. El contrato exacto del mensaje debe **validarse con Cellbyte** o con quien defina el estándar institucional. |
| **Dependencias y responsabilidades de terceros** | Disponibilidad del endpoint de Cellbyte, certificados válidos, posibles listas blancas de IP del lado del hospital o del proveedor externo. |
| **Riesgos identificados** | Indisponibilidad temporal del servicio externo, cambios en el formato del mensaje, límites de tasa, errores de red o de certificados. |
| **Estrategia ante indisponibilidad** | La **preadmisión y el flujo principal** no deben quedar bloqueados: se registran intentos en bitácora y **reintentos**; el hospital puede definir procedimiento manual de verificación mientras el servicio externo se recupera. |
| **Nivel de acoplamiento** | **Bajo** respecto al núcleo operativo: un fallo en Cellbyte afecta principalmente al **envío hacia ese sistema**, no necesariamente al resto de turnos y pantallas, salvo que el hospital decida bloquear flujos de negocio de forma explícita. |

---

## 6. Comunicación con el paciente

| Aspecto | Respuesta |
|--------|-----------|
| **Confirmaciones de preadmisión** | Depende de los canales habilitados en la plataforma (p. ej. notificaciones si existe módulo de correo configurado). **SMS o WhatsApp** suelen requerir **proveedor de mensajería**, costos adicionales y cumplimiento normativo; pueden cotizarse como alcance aparte. |
| **Notificaciones de recordatorio** | Misma consideración: requieren canal (email/SMS) y configuración del hospital. |
| **Envío de documentos** | Consentimientos u otros PDF pueden incorporarse con **desarrollo y almacenamiento** acordados explícitamente. |
| **Uso del QR** | El QR se utiliza como **identificador para llegada / check-in** y en flujos de visualización; no sustituye por sí solo otros canales bidireccionales (SMS, etc.) salvo que se integren. |

---

## 7. Documentación y capacitación

| Aspecto | Respuesta |
|--------|-----------|
| **Manuales** | Documentación en repositorio (README, despliegue); puede ampliarse con **manual de usuario** (operación en staff, anfitrión, monitor) según lo acordado en contrato o en fase de soporte. |
| **Plan de capacitación** | Sesión(es) acordadas (presencial o videollamada) orientadas a roles: recepción, anfitrión, supervisión y, si aplica, personal técnico del hospital. |
| **Materiales de apoyo** | Guías paso a paso; opcionalmente vídeos cortos si se incluyen en el alcance contractual. |
| **Transferencia de conocimiento** | Entrega de acceso al código y documentación según contrato; variables de entorno y procedimientos de despliegue; punto de contacto técnico en el hospital para evoluciones futuras. |

---

## 8. Alcance del soporte post-implementación

| Aspecto | Respuesta |
|--------|-----------|
| **Soporte incluido en los 3 meses** | Corrección de **defectos** atribuibles al software entregado dentro del alcance acordado; **consultas de uso** razonables; apoyo a **incidentes de despliegue** cuando el hospital provee acceso, logs y entorno acordado. **No incluye**, salvo presupuesto aparte, desarrollo de **nuevas funcionalidades mayores** o integraciones no especificadas. |
| **Soporte posterior a 3 meses** | Atención bajo **contrato de soporte** (suscripción con bolsa de horas o mes fijo, o acuerdo por incidente), con condiciones y SLAs en anexo. |
| **Modalidades de soporte adicional** | Por ejemplo: **cuota mensual** con horas incluidas y SLA definido; **bolsa de horas** con vigencia; **renovación automática** opcional; proyectos de **evolutivo** cotizados por separado. |

---

## 9. Consideraciones operativas

| Aspecto | Respuesta |
|--------|-----------|
| **Procedimientos ante fallos del sistema** | Seguir el escalamiento del apartado 1; si la base de datos o el servidor de aplicación fallan, interviene en primer término el **equipo o proveedor de infraestructura del hospital**. |
| **Operación en contingencia** | **Modo manual** (turnos y datos en soporte alternativo) como respaldo operativo definido por el hospital mientras se restablece el sistema. |
| **Impacto en la continuidad del servicio clínico** | La institución mantiene los protocolos asistenciales si la pantalla de llamados o la aplicación no están disponibles; la solución digital es un apoyo, no el único canal de organización del flujo físico de pacientes. |

---

## 10. Validación del alcance vs. inversión

| Aspecto | Respuesta |
|--------|-----------|
| **Supuestos para la estimación** | Alcance alineado con los documentos de requisitos acordados (p. ej. Preadmision.md, requisitos.pdf); un entorno de **producción gestionado por el hospital**; integración Cellbyte en modalidad **técnica preparada** hasta validación final con el tercero; sin campañas masivas SMS/WhatsApp salvo cotización explícita. |
| **Exclusiones del alcance** | Costos de **infraestructura cloud**, dominios, licencias de terceros no incluidas en el desarrollo; asesoría legal exclusiva del hospital; **nuevas integraciones** no descritas en el alcance; despliegues **on-premise** no especificados de antemano; capacitación ilimitada fuera de lo contratado. |
| **Posibles costos adicionales** | Servicios de hosting y **PostgreSQL gestionado**; SMS/WhatsApp u otros canales de mensajería; integraciones adicionales; horas de **acompañamiento con Cellbyte** en ambiente productivo; **soporte más allá de los 3 meses** según tarifa del contrato ampliado; certificados o WAF avanzados si el hospital los exige. |

---

## Cierre

Los puntos anteriores pueden incorporarse como anexo al contrato o a la propuesta económica. Los **SLA, horarios y exclusiones** finales deben **revisarse y firmarse** por ambas partes. Para el período posterior a los **3 meses** de soporte incluido, se puede presentar una **propuesta de contrato de soporte extendido** según las necesidades del hospital.

---

*Referencia: preguntas originales en `aclaraciones.txt` (raíz del proyecto).*
