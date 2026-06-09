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
import { AuditService } from '../audit/audit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private auditService: AuditService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterPublicUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.registerPublicPatient(body);
    await this.auditService.log('user_registered', {
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
    });
    return user;
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
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
    return req.user;
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
    });
    return { agentState: agentState ?? null };
  }
}
