import { Controller, Post, Body, Get, Patch, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto, LoginDto, UserResponseDto, TokenResponseDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AgentState } from '../common/enums';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
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
    return { agentState: agentState ?? null };
  }
}
