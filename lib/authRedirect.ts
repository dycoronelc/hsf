import type { AccessUser } from './authRoles'
import { canAccessHost, canAccessReports, canAccessStaffConsole } from './authRoles'

/**
 * Destino tras login según permisos efectivos (o fallback por rol).
 * No redirige a Llegadas si el usuario perdió `view_host_work_list`.
 */
export function getPostLoginPath(roleOrUser?: AccessUser | string | null): string {
  if (!roleOrUser) return '/dashboard'
  const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role
  if (role === 'admin') return '/admin'
  if (role === 'patient') return '/dashboard'

  if (canAccessHost(roleOrUser)) return '/host'
  if (canAccessStaffConsole(roleOrUser)) return '/staff'
  if (canAccessReports(roleOrUser)) return '/reports'
  return '/dashboard'
}
