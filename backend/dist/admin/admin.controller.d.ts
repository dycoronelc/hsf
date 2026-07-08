import { AdminService } from './admin.service';
import { CreateMatrixRoleDto, CreateStaffUserDto, CreateTicketTypeDto, PatchMatrixRoleDto, UpdateRolePermissionsDto, UpdateStaffUserDto, UpdateTicketTypeDto } from './dto/admin.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getPermissionCatalog(): {
        permissions: readonly [{
            readonly key: "view_host_work_list";
            readonly label: "Ver lista de llegadas (anfitrión)";
        }, {
            readonly key: "confirm_arrival";
            readonly label: "Confirmar llegada de paciente";
        }, {
            readonly key: "activate_ticket";
            readonly label: "Activar ticket / crear turno en recepción";
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
        roles: import("../common/enums").UserRole[];
    };
    getRolePermissions(): Promise<{
        permissions: readonly [{
            readonly key: "view_host_work_list";
            readonly label: "Ver lista de llegadas (anfitrión)";
        }, {
            readonly key: "confirm_arrival";
            readonly label: "Confirmar llegada de paciente";
        }, {
            readonly key: "activate_ticket";
            readonly label: "Activar ticket / crear turno en recepción";
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
        roles: string[];
        roleSummaries: {
            role: string;
            isActive: boolean;
            enabledCount: number;
            totalCount: 14;
        }[];
        addableRoles: import("../common/enums").UserRole[];
        matrix: Record<string, Record<string, boolean>>;
    }>;
    updateRolePermissions(dto: UpdateRolePermissionsDto, req: any): Promise<{
        permissions: readonly [{
            readonly key: "view_host_work_list";
            readonly label: "Ver lista de llegadas (anfitrión)";
        }, {
            readonly key: "confirm_arrival";
            readonly label: "Confirmar llegada de paciente";
        }, {
            readonly key: "activate_ticket";
            readonly label: "Activar ticket / crear turno en recepción";
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
        roles: string[];
        roleSummaries: {
            role: string;
            isActive: boolean;
            enabledCount: number;
            totalCount: 14;
        }[];
        addableRoles: import("../common/enums").UserRole[];
        matrix: Record<string, Record<string, boolean>>;
    }>;
    addRoleToMatrix(dto: CreateMatrixRoleDto, req: any): Promise<{
        permissions: readonly [{
            readonly key: "view_host_work_list";
            readonly label: "Ver lista de llegadas (anfitrión)";
        }, {
            readonly key: "confirm_arrival";
            readonly label: "Confirmar llegada de paciente";
        }, {
            readonly key: "activate_ticket";
            readonly label: "Activar ticket / crear turno en recepción";
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
        roles: string[];
        roleSummaries: {
            role: string;
            isActive: boolean;
            enabledCount: number;
            totalCount: 14;
        }[];
        addableRoles: import("../common/enums").UserRole[];
        matrix: Record<string, Record<string, boolean>>;
    }>;
    patchMatrixRole(role: string, dto: PatchMatrixRoleDto, req: any): Promise<{
        permissions: readonly [{
            readonly key: "view_host_work_list";
            readonly label: "Ver lista de llegadas (anfitrión)";
        }, {
            readonly key: "confirm_arrival";
            readonly label: "Confirmar llegada de paciente";
        }, {
            readonly key: "activate_ticket";
            readonly label: "Activar ticket / crear turno en recepción";
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
        roles: string[];
        roleSummaries: {
            role: string;
            isActive: boolean;
            enabledCount: number;
            totalCount: 14;
        }[];
        addableRoles: import("../common/enums").UserRole[];
        matrix: Record<string, Record<string, boolean>>;
    }>;
    removeRoleFromMatrix(role: string, req: any): Promise<{
        permissions: readonly [{
            readonly key: "view_host_work_list";
            readonly label: "Ver lista de llegadas (anfitrión)";
        }, {
            readonly key: "confirm_arrival";
            readonly label: "Confirmar llegada de paciente";
        }, {
            readonly key: "activate_ticket";
            readonly label: "Activar ticket / crear turno en recepción";
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
        roles: string[];
        roleSummaries: {
            role: string;
            isActive: boolean;
            enabledCount: number;
            totalCount: 14;
        }[];
        addableRoles: import("../common/enums").UserRole[];
        matrix: Record<string, Record<string, boolean>>;
    }>;
    listTicketTypes(): Promise<import("../services/entities/service.entity").Service[]>;
    createTicketType(dto: CreateTicketTypeDto, req: any): Promise<import("../services/entities/service.entity").Service>;
    updateTicketType(id: number, dto: UpdateTicketTypeDto, req: any): Promise<import("../services/entities/service.entity").Service>;
    deleteTicketType(id: number, req: any): Promise<{
        ok: boolean;
    }>;
    listStaffUsers(): Promise<import("../users/entities/user.entity").User[]>;
    createStaffUser(dto: CreateStaffUserDto, req: any): Promise<{
        id: number;
        email: string;
        fullName: string;
        role: import("../common/enums").UserRole;
        isActive: boolean;
    }>;
    updateStaffUser(id: number, dto: UpdateStaffUserDto, req: any): Promise<{
        id: number;
        email: string;
        fullName: string;
        role: import("../common/enums").UserRole;
        isActive: boolean;
    }>;
    deleteStaffUser(id: number, req: any): Promise<{
        ok: boolean;
    }>;
    createService(req: {
        user: {
            id: number;
        };
    }, name: string, code: string, area: string, estimatedTime?: number): Promise<import("../services/entities/service.entity").Service>;
}
