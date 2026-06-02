export const STAFF_ROLES = [
  'admin',
  'reception',
  'technician',
  'supervisor',
  'auditor',
  'anfitrion',
  'oficial_admision',
] as const

export function isPatientRole(role?: string | null): boolean {
  return !role || role === 'patient'
}

export function isStaffRole(role?: string | null): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role)
}
