import { UserRole } from '../common/enums';
export declare const ADMIN_PERMISSION_CATALOG: readonly [{
    readonly key: "view_host_work_list";
    readonly label: "Ver lista de llegadas (anfitrión)";
}, {
    readonly key: "confirm_arrival";
    readonly label: "Confirmar llegada de paciente";
}, {
    readonly key: "activate_ticket";
    readonly label: "Activar ticket de admisión";
}, {
    readonly key: "staff_check_in";
    readonly label: "Check-in por QR";
}, {
    readonly key: "staff_call_ticket";
    readonly label: "Llamar ticket";
}, {
    readonly key: "staff_transfer_ticket";
    readonly label: "Transferir ticket";
}, {
    readonly key: "staff_complete_ticket";
    readonly label: "Finalizar ticket";
}, {
    readonly key: "view_monitor";
    readonly label: "Ver monitor público";
}, {
    readonly key: "view_reports";
    readonly label: "Consultar reportes";
}, {
    readonly key: "export_reports";
    readonly label: "Exportar reportes";
}, {
    readonly key: "review_preadmissions";
    readonly label: "Revisar preadmisiones";
}, {
    readonly key: "manage_ticket_types";
    readonly label: "Gestionar tipos de ticket";
}, {
    readonly key: "manage_role_permissions";
    readonly label: "Gestionar permisos por rol";
}, {
    readonly key: "manage_users";
    readonly label: "Gestionar usuarios";
}];
export type AdminPermissionKey = (typeof ADMIN_PERMISSION_CATALOG)[number]['key'];
export declare const CONFIGURABLE_ROLES: UserRole[];
export declare const DEFAULT_ROLE_PERMISSIONS: Record<string, AdminPermissionKey[]>;
