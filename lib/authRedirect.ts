export function getPostLoginPath(role?: string | null): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'anfitrion':
    case 'oficial_admision':
      return '/host'
    case 'reception':
    case 'technician':
    case 'supervisor':
    case 'laboratorio':
    case 'radiologia':
      return '/staff'
    case 'auditor':
      return '/reports'
    default:
      return '/dashboard'
  }
}
