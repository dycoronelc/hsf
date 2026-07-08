export const ARRIVAL_STATE_LABELS: Record<string, string> = {
  registrado: 'Registrado',
  espera_llegada: 'En espera de llegada',
  paciente_presente: 'Paciente presente',
  ticket_generado: 'Ticket generado',
}

export const PREADMISSION_STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  en_revision: 'En revisión',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  requiere_subsanacion: 'Requiere subsanación',
}

export const DEPARTAMENTO_LABELS: Record<string, string> = {
  RAD: 'Radiología',
  LAB: 'Laboratorio',
}

export const ATTACHMENT_FIELD_LABELS: Record<string, string> = {
  cedulaimagen: 'Imagen de cédula',
  ordenimagen: 'Orden médica',
  preautorizacion: 'Preautorización',
  carnetseguro: 'Carnet de seguro',
  certificadoSeguro: 'Certificado de seguro',
  ssimagen: 'Imagen SS',
}

export function formatPreadmissionDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('es-PA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
