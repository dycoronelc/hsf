import { Controller, Post, Body, Get, Patch, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {
  LoginDto,
  UserResponseDto,
  TokenResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RegisterPublicUserDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AgentState } from '../common/enums';
import { AuditService, clientIpFromRequest } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private auditService: AuditService,
    private permissionsService: PermissionsService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterPublicUserDto, @Request() req): Promise<UserResponseDto> {
    const user = await this.usersService.registerPublicPatient(body);
    await this.auditService.log('user_registered', {
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
      ipAddress: clientIpFromRequest(req),
      module: 'auth',
    });
    return user;
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req): Promise<TokenResponseDto> {
    return this.authService.login(loginDto, { ipAddress: clientIpFromRequest(req) });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    await this.auditService.log('user_logout', {
      entityType: 'user',
      entityId: req.user.id,
      userId: req.user.id,
      ipAddress: clientIpFromRequest(req),
      module: 'auth',
    });
    return { ok: true };
  }

  @Post('refresh-session')
  @UseGuards(JwtAuthGuard)
  async refreshSession(@Request() req): Promise<TokenResponseDto> {
    return this.authService.refreshSession(req.user, {
      ipAddress: clientIpFromRequest(req),
    });
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req): Promise<UserResponseDto> {
    const permissions = await this.permissionsService.listAllowedPermissionKeys(req.user.role);
    return {
      ...req.user,
      permissions,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('agent-state')
  async updateAgentState(@Request() req, @Body('agentState') agentState: AgentState | null) {
    await this.usersService.updateAgentState(req.user.id, agentState ?? null);
    await this.auditService.log('agent_state_changed', {
      entityType: 'user',
      entityId: req.user.id,
      userId: req.user.id,
      details: agentState ?? 'null',
      ipAddress: clientIpFromRequest(req),
      module: 'staff',
    });
    return { agentState: agentState ?? null };
  }
}
