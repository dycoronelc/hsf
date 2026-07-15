import type { ContextualHelpBlock, FaqItem, ManualSection } from './types'

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'intro',
    title: 'Introducción',
    audience: 'all',
    image: {
      src: '/logo-hospital-santa-fe.png',
      alt: 'Hospital Santa Fe Panamá',
      caption: 'Portal digital de preadmisión, turnos y atención.',
    },
    paragraphs: [
      'La plataforma del Hospital Santa Fe permite completar la preadmisión digital, gestionar turnos y apoyar la operación del hospital (recepción, anfitrión, monitor y reportes).',
      'Use un navegador actualizado (Chrome, Edge o Safari). Para escanear QR de cédula y subir documentos, se recomienda conexión estable y acceso por HTTPS.',
    ],
  },
  {
    id: 'preadmission-overview',
    title: 'Preadmisión digital (paciente)',
    audience: 'patient',
    image: {
      src: '/Santa Fe 2.jpg',
      alt: 'Instalaciones Hospital Santa Fe',
      caption: 'Complete la preadmisión antes de su cita en Radiología o Laboratorio.',
    },
    paragraphs: [
      'Debe tener una cuenta registrada e iniciar sesión antes de completar la preadmisión. El proceso tiene 8 pasos: área y fecha, identificación, datos personales, contacto, emergencia, seguro, documentos y confirmación.',
    ],
    bullets: [
      'Seleccione departamento RAD (Radiología) o LAB (Laboratorio).',
      'La fecha probable de atención no puede ser anterior a hoy.',
      'Verifique su correo con el código de 6 dígitos en el paso 4.',
      'Adjunte imagen de cédula y orden médica (obligatorios) en formatos JPG, PNG o PDF.',
      'Al finalizar recibirá un código QR y correo de confirmación (si SMTP está configurado).',
    ],
  },
  {
    id: 'preadmission-qr',
    title: 'Escaneo QR y documentos',
    audience: 'patient',
    image: {
      src: '/logo-hospital-santa-fe.png',
      alt: 'Lectura de cédula',
    },
    paragraphs: [
      'Puede escanear el QR del reverso de la cédula con la cámara trasera, subir una foto nítida del QR o pegar manualmente el texto leído.',
    ],
    bullets: [
      'La cámara en vivo requiere HTTPS (no funciona en HTTP excepto localhost).',
      'Use buena luz, enfoque y encuadre solo el QR con margen blanco.',
      'Si la foto falla, pruebe con la cámara nativa del teléfono y pegue el texto en el cuadro.',
    ],
  },
  {
    id: 'account',
    title: 'Cuenta de paciente y turnos',
    audience: 'patient',
    paragraphs: [
      'Regístrese con su correo y contraseña para acceder a la preadmisión digital y agilizar futuros trámites.',
    ],
    bullets: [
      'Registro: correo, contraseña segura, documento y datos básicos.',
      'Recuperación de contraseña desde «¿Se le olvidó la contraseña?» en el login.',
    ],
  },
  {
    id: 'staff-login',
    title: 'Acceso staff',
    audience: 'staff',
    paragraphs: [
      'El personal del hospital inicia sesión con correo y contraseña institucional asignados por el administrador.',
      'Tras el login, el panel de inicio muestra solo las opciones permitidas para su rol.',
    ],
  },
  {
    id: 'host',
    title: 'Lista de llegadas (Anfitrión)',
    audience: 'staff',
    paragraphs: [
      'En /host se gestionan preadmisiones en espera de llegada: confirmar presencia del paciente y activar ticket de admisión.',
    ],
    bullets: [
      'Filtre por estado de llegada o busque por nombre/documento.',
      'La lista se actualiza automáticamente cada ~15 segundos.',
    ],
  },
  {
    id: 'staff-console',
    title: 'Consola operativa (Staff)',
    audience: 'staff',
    paragraphs: [
      'Desde /staff el equipo llama turnos, inicia y finaliza atención, transfiere a Radiología/Laboratorio y registra check-in por QR.',
    ],
    bullets: [
      'Indique su estado de agente (en línea, almuerzo, etc.) antes de operar turnos.',
      'El monitor público refleja los turnos llamados.',
    ],
  },
  {
    id: 'monitor-kiosk',
    title: 'Monitor y kiosco',
    audience: 'staff',
    paragraphs: [
      'El monitor (/monitor) muestra colas y turnos llamados en pantalla de sala de espera.',
      'El kiosco (/kiosk) permite al paciente sacar turno sin iniciar sesión.',
    ],
  },
  {
    id: 'admin',
    title: 'Administración',
    audience: 'staff',
    paragraphs: [
      'Los administradores gestionan usuarios, permisos por rol, tipos de ticket y configuración operativa desde /admin.',
    ],
  },
  {
    id: 'support',
    title: 'Soporte y problemas frecuentes',
    audience: 'all',
    paragraphs: [
      'Si no recibe el código de verificación por correo, revise spam y confirme que el correo esté bien escrito.',
      'Para errores de cámara o adjuntos, verifique HTTPS, permisos del navegador y tamaño máximo del archivo (15 MB).',
      'Contacte a soporte TI del hospital si el problema persiste.',
    ],
  },
]

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-preadmission-login',
    category: 'Preadmisión',
    question: '¿Necesito crear una cuenta para la preadmisión?',
    answer:
      'Sí. Debe crear una cuenta e iniciar sesión antes de iniciar la preadmisión digital.',
  },
  {
    id: 'faq-duplicate',
    category: 'Preadmisión',
    question: '¿Por qué me dice que ya existe una preadmisión?',
    answer:
      'Solo se permite una preadmisión activa por documento, departamento (RAD/LAB) y fecha de atención. Puede registrar otro servicio distinto para la misma fecha si aplica.',
  },
  {
    id: 'faq-date',
    category: 'Preadmisión',
    question: '¿Puedo elegir una fecha pasada?',
    answer: 'No. La fecha probable de atención debe ser hoy o una fecha futura.',
  },
  {
    id: 'faq-email-code',
    category: 'Preadmisión',
    question: 'No me llega el código de verificación del correo',
    answer:
      'Revise la carpeta de spam, espere unos minutos y use «Reenviar código». El código expira en aproximadamente una hora. Confirme que escribió bien su correo.',
  },
  {
    id: 'faq-camera',
    category: 'Preadmisión',
    question: 'La cámara para escanear la cédula no abre',
    answer:
      'Use HTTPS (candado en el navegador), permita acceso a la cámara en Safari (iPhone) o Chrome (Android). Alternativa: suba foto del QR o pegue el texto manualmente.',
  },
  {
    id: 'faq-attachments',
    category: 'Preadmisión',
    question: '¿Qué documentos debo adjuntar?',
    answer:
      'La imagen de cédula y la orden médica son obligatorias (JPG, PNG o PDF). Si tiene seguro, el carné y el certificado de seguro también son obligatorios. La preautorización es opcional.',
  },
  {
    id: 'faq-password',
    category: 'Cuenta',
    question: 'Olvidé mi contraseña',
    answer:
      'En la pantalla de login use «¿Se le olvidó la contraseña?», ingrese su correo y siga el enlace recibido (válido por tiempo limitado).',
  },
  {
    id: 'faq-tickets',
    category: 'Turnos',
    question: '¿Cómo veo mi turno?',
    answer:
      'Inicie sesión como paciente y entre a «Mis Turnos». Verá número, servicio, estado y código QR para check-in.',
  },
  {
    id: 'faq-kiosk',
    category: 'Turnos',
    question: '¿Para qué sirve el kiosco?',
    answer:
      'Es una pantalla pública donde el paciente elige servicio y obtiene un turno con QR sin necesidad de login.',
  },
  {
    id: 'faq-host',
    category: 'Staff',
    question: '¿Qué hace el anfitrión en la lista de llegadas?',
    answer:
      'Confirma que el paciente llegó al hospital y activa el ticket de admisión vinculado a la preadmisión.',
  },
  {
    id: 'faq-monitor',
    category: 'Staff',
    question: '¿Cómo configuro el monitor de sala?',
    answer:
      'Abra /monitor en un navegador en pantalla completa conectado a la TV de espera. Los turnos llamados desde staff aparecerán automáticamente.',
  },
  {
    id: 'faq-geo',
    category: 'General',
    question: 'No encuentro mi provincia, distrito o corregimiento',
    answer:
      'Use la lista desplegable en orden: primero provincia, luego distrito y corregimiento. Si falta una opción, reporte a TI del hospital para actualizar el catálogo.',
  },
]

export const CONTEXTUAL_HELP: ContextualHelpBlock[] = [
  {
    id: 'login',
    routePrefixes: ['/login'],
    title: 'Inicio de sesión',
    summary: 'Acceda con el correo y contraseña que le asignó el hospital.',
    tips: [
      'Pacientes pueden registrarse con el enlace «Regístrate aquí».',
      'Use recuperación de contraseña si no recuerda su clave.',
      'El personal debe usar credenciales institucionales, no cuentas personales de prueba.',
    ],
  },
  {
    id: 'register',
    routePrefixes: ['/register'],
    title: 'Registro de paciente',
    summary: 'Cree su cuenta para gestionar turnos y futuras visitas.',
    tips: [
      'La contraseña debe tener al menos 8 caracteres, letras y una mayúscula.',
      'Puede escanear el QR de la cédula para autocompletar datos.',
    ],
  },
  {
    id: 'preadmission-step-1',
    routePrefixes: ['/preadmission'],
    preadmissionSteps: [1],
    title: 'Paso 1 — Área y fecha',
    summary: 'Seleccione Radiología o Laboratorio y la fecha de su cita.',
    tips: [
      'La fecha no puede ser anterior a hoy.',
      'RAD = estudios de imagen; LAB = análisis clínicos.',
    ],
  },
  {
    id: 'preadmission-step-2',
    routePrefixes: ['/preadmission'],
    preadmissionSteps: [2],
    title: 'Paso 2 — Identificación',
    summary: 'Indique cédula o pasaporte y busque datos previos si ya se registró.',
    tips: [
      'Use el escáner QR de cédula o pegue el texto del QR.',
      'Solo letras, números y guiones en el número de documento.',
    ],
  },
  {
    id: 'preadmission-step-3',
    routePrefixes: ['/preadmission'],
    preadmissionSteps: [3],
    title: 'Paso 3 — Datos personales',
    summary: 'Complete nombres, apellidos, fecha de nacimiento y datos clínicos básicos.',
    tips: [
      'Nombres solo con letras, espacios, apóstrofes o guiones.',
      'La fecha de nacimiento debe ser válida y razonable (máx. 120 años).',
    ],
  },
  {
    id: 'preadmission-step-4',
    routePrefixes: ['/preadmission'],
    preadmissionSteps: [4],
    title: 'Paso 4 — Contacto y dirección',
    summary: 'Verifique su correo y complete dirección en Panamá.',
    tips: [
      'Debe verificar el correo con el código de 6 dígitos antes de continuar.',
      'Seleccione provincia, distrito y corregimiento en ese orden.',
    ],
  },
  {
    id: 'preadmission-step-5',
    routePrefixes: ['/preadmission'],
    preadmissionSteps: [5],
    title: 'Paso 5 — Contacto de emergencia',
    summary: 'Persona a contactar en caso de urgencia durante su atención.',
    tips: ['Indique relación (familiar, cónyuge, etc.) y datos de contacto válidos.'],
  },
  {
    id: 'preadmission-step-6',
    routePrefixes: ['/preadmission'],
    preadmissionSteps: [6],
    title: 'Paso 6 — Seguro',
    summary: 'Indique si mantiene póliza de seguro o atiende como privado.',
    tips: [
      'Si responde Sí, complete compañía y número de póliza.',
      'Puede indicar médico referente y procedimiento si lo conoce.',
    ],
  },
  {
    id: 'preadmission-step-7',
    routePrefixes: ['/preadmission'],
    preadmissionSteps: [7],
    title: 'Paso 7 — Documentos',
    summary: 'Adjunte imagen de cédula y documentos de apoyo.',
    tips: [
      'Cédula obligatoria. Máximo 15 MB por archivo.',
      'Si retrocede con «Anterior», los archivos ya seleccionados se conservan.',
    ],
  },
  {
    id: 'preadmission-step-8',
    routePrefixes: ['/preadmission'],
    preadmissionSteps: [8],
    title: 'Paso 8 — Confirmación',
    summary: 'Revise el resumen y envíe la preadmisión.',
    tips: [
      'Guarde o capture el código QR mostrado al finalizar.',
      'Presente el QR el día de su cita en el hospital.',
    ],
  },
  {
    id: 'preadmission-general',
    routePrefixes: ['/preadmission'],
    title: 'Preadmisión digital',
    summary: 'Asistente de 8 pasos para Radiología o Laboratorio.',
    tips: [
      'Use «Siguiente» solo cuando el paso actual esté completo.',
      'Puede volver con «Anterior» sin perder datos ya ingresados.',
    ],
  },
  {
    id: 'dashboard',
    routePrefixes: ['/dashboard'],
    title: 'Panel de inicio',
    summary: 'Accesos rápidos según su rol en el hospital.',
    tips: [
      'Pacientes: preadmisión digital (requiere cuenta).',
      'Staff: consola, llegadas, monitor y reportes según permisos.',
    ],
  },
  {
    id: 'tickets',
    routePrefixes: ['/tickets', '/tickets/new'],
    title: 'Mis turnos',
    summary: 'Consulte turnos activos y códigos QR.',
    tips: ['Muestre el QR en recepción para check-in.', 'Actualice la página si el estado no cambia.'],
  },
  {
    id: 'host',
    routePrefixes: ['/host'],
    title: 'Llegadas — Anfitrión',
    summary: 'Gestione llegada de pacientes con preadmisión.',
    tips: ['Confirme llegada antes de activar ticket.', 'Use filtros para encontrar pacientes rápido.'],
  },
  {
    id: 'staff',
    routePrefixes: ['/staff'],
    title: 'Consola staff',
    summary: 'Operación de turnos: llamar, atender, transferir.',
    tips: [
      'Escanee QR del paciente para check-in.',
      'Verifique su estado de agente antes de llamar turnos.',
    ],
  },
  {
    id: 'monitor',
    routePrefixes: ['/monitor'],
    title: 'Monitor de llamados',
    summary: 'Pantalla para sala de espera.',
    tips: ['Use pantalla completa del navegador.', 'Conecte audio si desea anuncio por voz.'],
  },
  {
    id: 'kiosk',
    routePrefixes: ['/kiosk'],
    title: 'Kiosco de turnos',
    summary: 'Autoservicio para sacar turno sin login.',
    tips: ['Seleccione el servicio correcto antes de confirmar.', 'Conserve el ticket o QR impreso.'],
  },
  {
    id: 'admin',
    routePrefixes: ['/admin'],
    title: 'Administración',
    summary: 'Usuarios, permisos y configuración.',
    tips: [
      'Cambie contraseñas iniciales en producción.',
      'Revise matriz de permisos por rol antes de go-live.',
    ],
  },
  {
    id: 'reports',
    routePrefixes: ['/reports'],
    title: 'Reportes',
    summary: 'Indicadores operativos y exportaciones.',
    tips: ['Use filtros de fecha para acotar resultados.', 'Exporte CSV cuando necesite análisis externo.'],
  },
  {
    id: 'forgot-password',
    routePrefixes: ['/forgot-password', '/reset-password'],
    title: 'Recuperar contraseña',
    summary: 'Restablezca acceso por correo electrónico.',
    tips: [
      'El enlace del correo expira; solicite uno nuevo si venció.',
      'Revise carpeta de spam.',
    ],
  },
]
