import { UserRole } from '../common/enums';

export const ADMIN_PERMISSION_CATALOG = [
  { key: 'view_host_work_list', label: 'Ver lista de llegadas (anfitrión)' },
  { key: 'confirm_arrival', label: 'Confirmar llegada de paciente' },
  { key: 'activate_ticket', label: 'Activar ticket de admisión' },
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

export const DEFAULT_ROLE_PERMISSIONS: Record<string, AdminPermissionKey[]> = {
  [UserRole.ANFITRION]: ['view_host_work_list', 'confirm_arrival', 'activate_ticket', 'view_monitor'],
  [UserRole.OFICIAL_ADMISION]: [
    'view_host_work_list',
    'confirm_arrival',
    'activate_ticket',
    'staff_check_in',
    'staff_call_ticket',
    'staff_transfer_ticket',
    'staff_complete_ticket',
    'view_monitor',
    'review_preadmissions',
  ],
  [UserRole.RECEPTION]: [
    'view_host_work_list',
    'confirm_arrival',
    'activate_ticket',
    'staff_check_in',
    'staff_call_ticket',
    'staff_transfer_ticket',
    'staff_complete_ticket',
    'view_monitor',
    'review_preadmissions',
  ],
  [UserRole.SUPERVISOR]: [
    'view_host_work_list',
    'confirm_arrival',
    'activate_ticket',
    'staff_check_in',
    'staff_call_ticket',
    'staff_transfer_ticket',
    'staff_complete_ticket',
    'view_monitor',
    'view_reports',
    'export_reports',
    'review_preadmissions',
  ],
  [UserRole.LABORATORIO]: [
    'staff_check_in',
    'staff_call_ticket',
    'staff_transfer_ticket',
    'staff_complete_ticket',
    'view_monitor',
  ],
  [UserRole.RADIOLOGIA]: [
    'staff_check_in',
    'staff_call_ticket',
    'staff_transfer_ticket',
    'staff_complete_ticket',
    'view_monitor',
  ],
  [UserRole.AUDITOR]: ['view_reports', 'export_reports', 'view_monitor'],
  [UserRole.TECHNICIAN]: [
    'staff_check_in',
    'staff_call_ticket',
    'staff_transfer_ticket',
    'staff_complete_ticket',
    'view_monitor',
  ],
  [UserRole.ADMIN]: ALL_KEYS,
};
