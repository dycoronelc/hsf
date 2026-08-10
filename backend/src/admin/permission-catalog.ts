import { UserRole } from '../common/enums';

export const ADMIN_PERMISSION_CATALOG = [
  { key: 'view_host_work_list', label: 'Ver lista de llegadas (anfitrión)' },
  { key: 'confirm_arrival', label: 'Confirmar llegada de paciente' },
  { key: 'activate_ticket', label: 'Activar ticket / crear turno en recepción' },
  { key: 'staff_check_in', label: 'Check-in por QR' },
  { key: 'staff_call_ticket', label: 'Llamar ticket' },
  { key: 'staff_transfer_ticket', label: 'Transferir ticket' },
  { key: 'staff_complete_ticket', label: 'Finalizar ticket' },
  { key: 'view_monitor', label: 'Ver monitor público' },
  { key: 'view_reports', label: 'Consultar reportes' },
  { key: 'export_reports', label: 'Exportar reportes' },
  { key: 'review_preadmissions', label: 'Revisar preadmisiones' },
  { key: 'manage_ticket_types', label: 'Gestionar tipos de ticket' },
  { key: 'manage_role_permissions', label: 'Gestionar permisos por rol' },
  { key: 'manage_users', label: 'Gestionar usuarios' },
] as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSION_CATALOG)[number]['key'];

export const CONFIGURABLE_ROLES: UserRole[] = [
  UserRole.ANFITRION,
  UserRole.OFICIAL_ADMISION,
  UserRole.RECEPTION,
  UserRole.SUPERVISOR,
  UserRole.LABORATORIO,
  UserRole.RADIOLOGIA,
  UserRole.AUDITOR,
  UserRole.TECHNICIAN,
];

const ALL_KEYS = ADMIN_PERMISSION_CATALOG.map((p) => p.key);

/** Llegadas (anfitrión): lista, confirmar y activar ticket. */
const HOST_PERMS: AdminPermissionKey[] = [
  'view_host_work_list',
  'confirm_arrival',
  'activate_ticket',
];

/** Consola staff: check-in, llamar, transferir, finalizar. */
const STAFF_PERMS: AdminPermissionKey[] = [
  'staff_check_in',
  'staff_call_ticket',
  'staff_transfer_ticket',
  'staff_complete_ticket',
];

const REPORT_PERMS: AdminPermissionKey[] = ['view_reports', 'export_reports'];

/**
 * Matriz recomendada Hospital Santa Fe:
 * - Oficial de Admisión y Anfitriones → Llegadas + Consola Staff
 * - Supervisor → Llegadas + Consola Staff + Reportes
 * - Radiología, Laboratorio y Recepción → solo Consola Staff
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, AdminPermissionKey[]> = {
  [UserRole.ANFITRION]: [...HOST_PERMS, ...STAFF_PERMS, 'view_monitor'],
  [UserRole.OFICIAL_ADMISION]: [...HOST_PERMS, ...STAFF_PERMS, 'view_monitor'],
  [UserRole.RECEPTION]: [...STAFF_PERMS, 'view_monitor'],
  [UserRole.SUPERVISOR]: [...HOST_PERMS, ...STAFF_PERMS, ...REPORT_PERMS, 'view_monitor'],
  [UserRole.LABORATORIO]: [...STAFF_PERMS, 'view_monitor'],
  [UserRole.RADIOLOGIA]: [...STAFF_PERMS, 'view_monitor'],
  [UserRole.AUDITOR]: [...REPORT_PERMS, 'view_monitor'],
  [UserRole.TECHNICIAN]: [...STAFF_PERMS, 'view_monitor'],
  [UserRole.ADMIN]: ALL_KEYS,
};

export function recommendedPermissionsMap(role: string): Record<string, boolean> {
  const allowed = new Set(DEFAULT_ROLE_PERMISSIONS[role] ?? []);
  const map: Record<string, boolean> = {};
  for (const p of ADMIN_PERMISSION_CATALOG) {
    map[p.key] = allowed.has(p.key);
  }
  return map;
}
