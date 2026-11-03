import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';

const SAFE_USER_SELECT = { id: true, username: true, email: true, createdAt: true, updatedAt: true } as const;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(input: RegisterDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          username: input.username.trim(),
          email: input.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(input.password, 12),
        },
        select: SAFE_USER_SELECT,
      });
      return { success: true, data: { user } };
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('Username atau email sudah digunakan.');
      throw error;
    }
  }

  async login(identifier: string, password: string) {
    const normalized = identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: normalized }, { email: normalized.toLowerCase() }] },
    });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!valid || !user) throw new UnauthorizedException('Username/email atau password salah.');
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      success: true,
      data: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: '1h',
        user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt, updatedAt: user.updatedAt },
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: SAFE_USER_SELECT });
    if (!user) throw new UnauthorizedException('Akun tidak tersedia.');
    return { success: true, data: { user } };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
