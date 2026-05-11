import { Repository } from 'typeorm';
import { Service } from '../services/entities/service.entity';
import { RolePermission } from './entities/role-permission.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums';
import { CreateTicketTypeDto, UpdateRolePermissionsDto, UpdateStaffUserDto, UpdateTicketTypeDto } from './dto/admin.dto';
import { AuditService } from '../audit/audit.service';
export declare class AdminService {
    private serviceRepository;
    private rolePermissionRepository;
    private userRepository;
    private auditService;
    constructor(serviceRepository: Repository<Service>, rolePermissionRepository: Repository<RolePermission>, userRepository: Repository<User>, auditService: AuditService);
    getPermissionCatalog(): {
        permissions: readonly [{
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
        roles: UserRole[];
    };
    private isAllowedByDefault;
    ensureDefaultPermissions(): Promise<void>;
    getRolePermissionsMatrix(): Promise<{
        permissions: readonly [{
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
        roles: UserRole[];
        matrix: Record<string, Record<string, boolean>>;
    }>;
    updateRolePermissions(dto: UpdateRolePermissionsDto, adminUserId: number): Promise<{
        permissions: readonly [{
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
        roles: UserRole[];
        matrix: Record<string, Record<string, boolean>>;
    }>;
    listTicketTypes(): Promise<Service[]>;
    createTicketType(dto: CreateTicketTypeDto, adminUserId: number): Promise<Service>;
    updateTicketType(id: number, dto: UpdateTicketTypeDto, adminUserId: number): Promise<Service>;
    listStaffUsers(): Promise<User[]>;
    updateStaffUser(id: number, dto: UpdateStaffUserDto, adminUserId: number): Promise<{
        id: number;
        email: string;
        fullName: string;
        role: UserRole;
        isActive: boolean;
    }>;
}
