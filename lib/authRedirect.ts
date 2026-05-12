export function getPostLoginPath(role?: string | null): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'reception':
    case 'technician':
    case 'supervisor':
    case 'auditor':
      return '/staff'
    case 'anfitrion':
    case 'oficial_admision':
      return '/host'
    default:
      return '/dashboard'
  }
}
