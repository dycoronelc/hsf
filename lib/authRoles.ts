/** Roles con acceso típico a lista de llegadas / anfitrión (fallback si aún no hay `permissions` en sesión). */
export const HOST_ROLES = [
  'anfitrion',
  'admin',
  'supervisor',
  'oficial_admision',
] as const

/** Roles con consola operativa de turnos (fallback). */
export const STAFF_CONSOLE_ROLES = [
  'admin',
  'reception',
  'technician',
  'supervisor',
  'oficial_admision',
  'anfitrion',
  'laboratorio',
  'radiologia',
] as const

/** Roles con reportes (fallback). */
export const REPORTS_ROLES = ['admin', 'supervisor', 'auditor'] as const

export type AccessUser = {
  role?: string | null
  permissions?: string[] | null
}

function asAccessUser(roleOrUser?: AccessUser | string | null): AccessUser {
  if (roleOrUser == null) return {}
  if (typeof roleOrUser === 'string') return { role: roleOrUser }
  return roleOrUser
}

/** `null` = aún no hay matriz de permisos en sesión → usar fallback por rol. */
function permissionGranted(user: AccessUser, key: string): boolean | null {
  if (!user.role) return false
  if (user.role === 'admin') return true
  if (Array.isArray(user.permissions)) {
    return user.permissions.includes(key)
  }
  return null
}

export function isPatientRole(role?: string | null): boolean {
  return !role || role === 'patient'
}

export function canAccessHost(roleOrUser?: AccessUser | string | null): boolean {
  const user = asAccessUser(roleOrUser)
  const granted = permissionGranted(user, 'view_host_work_list')
  if (granted !== null) return granted
  return !!user.role && (HOST_ROLES as readonly string[]).includes(user.role)
}

/** Consola staff si tiene al menos una acción operativa de cola. */
export function canAccessStaffConsole(roleOrUser?: AccessUser | string | null): boolean {
  const user = asAccessUser(roleOrUser)
  if (!user.role) return false
  if (user.role === 'admin') return true
  if (Array.isArray(user.permissions)) {
    return (
      user.permissions.includes('staff_check_in') ||
      user.permissions.includes('staff_call_ticket') ||
      user.permissions.includes('staff_transfer_ticket') ||
      user.permissions.includes('staff_complete_ticket')
    )
  }
  return (STAFF_CONSOLE_ROLES as readonly string[]).includes(user.role)
}

export function canAccessReports(roleOrUser?: AccessUser | string | null): boolean {
  const user = asAccessUser(roleOrUser)
  const granted = permissionGranted(user, 'view_reports')
  if (granted !== null) return granted
  return !!user.role && (REPORTS_ROLES as readonly string[]).includes(user.role)
}

/** Enlace/tarjeta Monitor. La pantalla /monitor sigue siendo pública para TVs. */
export function canAccessMonitor(roleOrUser?: AccessUser | string | null): boolean {
  const user = asAccessUser(roleOrUser)
  const granted = permissionGranted(user, 'view_monitor')
  if (granted !== null) return granted
  return (
    canAccessHost(user) ||
    canAccessStaffConsole(user) ||
    canAccessReports(user)
  )
}

export function canActivateTicket(roleOrUser?: AccessUser | string | null): boolean {
  const user = asAccessUser(roleOrUser)
  const granted = permissionGranted(user, 'activate_ticket')
  if (granted !== null) return granted
  return canAccessHost(user)
}

export function canExportReports(roleOrUser?: AccessUser | string | null): boolean {
  const user = asAccessUser(roleOrUser)
  const granted = permissionGranted(user, 'export_reports')
  if (granted !== null) return granted
  return canAccessReports(user)
}

export function isStaffRole(roleOrUser?: AccessUser | string | null): boolean {
  return (
    canAccessHost(roleOrUser) ||
    canAccessStaffConsole(roleOrUser) ||
    canAccessReports(roleOrUser) ||
    canAccessMonitor(roleOrUser)
  )
}
