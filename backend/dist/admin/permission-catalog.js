"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROLE_PERMISSIONS = exports.CONFIGURABLE_ROLES = exports.ADMIN_PERMISSION_CATALOG = void 0;
const enums_1 = require("../common/enums");
exports.ADMIN_PERMISSION_CATALOG = [
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
];
exports.CONFIGURABLE_ROLES = [
    enums_1.UserRole.ANFITRION,
    enums_1.UserRole.OFICIAL_ADMISION,
    enums_1.UserRole.RECEPTION,
    enums_1.UserRole.SUPERVISOR,
    enums_1.UserRole.LABORATORIO,
    enums_1.UserRole.RADIOLOGIA,
    enums_1.UserRole.AUDITOR,
    enums_1.UserRole.TECHNICIAN,
];
const ALL_KEYS = exports.ADMIN_PERMISSION_CATALOG.map((p) => p.key);
exports.DEFAULT_ROLE_PERMISSIONS = {
    [enums_1.UserRole.ANFITRION]: ['view_host_work_list', 'confirm_arrival', 'activate_ticket', 'view_monitor'],
    [enums_1.UserRole.OFICIAL_ADMISION]: [
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
    [enums_1.UserRole.RECEPTION]: [
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
    [enums_1.UserRole.SUPERVISOR]: [
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
    [enums_1.UserRole.LABORATORIO]: [
        'staff_check_in',
        'staff_call_ticket',
        'staff_transfer_ticket',
        'staff_complete_ticket',
        'view_monitor',
    ],
    [enums_1.UserRole.RADIOLOGIA]: [
        'staff_check_in',
        'staff_call_ticket',
        'staff_transfer_ticket',
        'staff_complete_ticket',
        'view_monitor',
    ],
    [enums_1.UserRole.AUDITOR]: ['view_reports', 'export_reports', 'view_monitor'],
    [enums_1.UserRole.TECHNICIAN]: [
        'staff_check_in',
        'staff_call_ticket',
        'staff_transfer_ticket',
        'staff_complete_ticket',
        'view_monitor',
    ],
    [enums_1.UserRole.ADMIN]: ALL_KEYS,
};
//# sourceMappingURL=permission-catalog.js.map