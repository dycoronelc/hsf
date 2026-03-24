import { UserRole, AgentState } from '../../common/enums';
import { Preadmission } from '../../preadmission/entities/preadmission.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
export declare class User {
    id: number;
    email: string;
    hashedPassword: string;
    fullName: string;
    phone: string;
    role: UserRole;
    isActive: boolean;
    agentState: AgentState | null;
    createdAt: Date;
    preadmissions: Preadmission[];
    tickets: Ticket[];
}
