export const ROLE_LABELS: Record<string, string> = {
  patient: 'Paciente',
  anfitrion: 'Anfitrión',
  oficial_admision: 'Oficial de Admisión',
  reception: 'Recepción',
  supervisor: 'Supervisor',
  laboratorio: 'Laboratorio',
  radiologia: 'Radiología',
  auditor: 'Auditor',
  technician: 'Técnico',
  admin: 'Administrador',
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}
