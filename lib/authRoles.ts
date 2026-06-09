/** Roles con acceso a lista de llegadas / anfitrión */
export const HOST_ROLES = [
  'anfitrion',
  'admin',
  'supervisor',
  'reception',
  'oficial_admision',
] as const

/** Roles con consola operativa de turnos (check-in, llamar, finalizar) */
export const STAFF_CONSOLE_ROLES = [
  'admin',
  'reception',
  'technician',
  'supervisor',
  'oficial_admision',
  'laboratorio',
  'radiologia',
] as const

/** Roles con reportes analíticos */
export const REPORTS_ROLES = ['admin', 'supervisor', 'auditor'] as const

export const STAFF_ROLES = [
  ...HOST_ROLES,
  ...STAFF_CONSOLE_ROLES,
  ...REPORTS_ROLES,
] as const

export function isPatientRole(role?: string | null): boolean {
  return !role || role === 'patient'
}

export function canAccessHost(role?: string | null): boolean {
  return !!role && (HOST_ROLES as readonly string[]).includes(role)
}

export function canAccessStaffConsole(role?: string | null): boolean {
  return !!role && (STAFF_CONSOLE_ROLES as readonly string[]).includes(role)
}

export function canAccessReports(role?: string | null): boolean {
  return !!role && (REPORTS_ROLES as readonly string[]).includes(role)
}

export function isStaffRole(role?: string | null): boolean {
  return (
    canAccessHost(role) || canAccessStaffConsole(role) || canAccessReports(role)
  )
}
