import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UserResponseDto } from '../auth/dto/auth.dto';
import { AgentState, UserRole } from '../common/enums';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingEmail = await this.findByEmail(createUserDto.email);
    if (existingEmail) {
      throw new ConflictException('Ya existe una cuenta con este correo electrónico');
    }
    if (createUserDto.nationalId) {
      const existingId = await this.usersRepository.findOne({
        where: { nationalId: createUserDto.nationalId },
      });
      if (existingId) {
        throw new ConflictException('Ya existe una cuenta con este número de identificación');
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      email: createUserDto.email.trim().toLowerCase(),
      fullName: createUserDto.fullName,
      phone: createUserDto.phone,
      nationalId: createUserDto.nationalId ?? null,
      birthDate: createUserDto.birthDate ?? null,
      role: createUserDto.role ?? UserRole.PATIENT,
      hashedPassword,
    });
    const savedUser = await this.usersRepository.save(user);
    return {
      id: savedUser.id,
      email: savedUser.email,
      fullName: savedUser.fullName,
      role: savedUser.role,
      isActive: savedUser.isActive,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: normalized })
      .getOne();
  }

  async updateAgentState(userId: number, agentState: AgentState | null): Promise<void> {
    await this.usersRepository.update(userId, { agentState });
  }

  async updatePassword(userId: number, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.usersRepository.update(userId, { hashedPassword });
  }

  async findOne(id: number): Promise<UserResponseDto | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
