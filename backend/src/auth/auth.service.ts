import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

const SAFE_USER_SELECT = {
  id: true,
  fullName: true,
  username: true,
  email: true,
  profilePhotoUrl: true,
  accountStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(input: RegisterDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          fullName: input.fullName?.trim() || null,
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
    const valid = user && user.accountStatus === 'active'
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!valid || !user) throw new UnauthorizedException('Username/email atau password salah.');
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      success: true,
      data: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: '1h',
        user: {
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          profilePhotoUrl: user.profilePhotoUrl,
          accountStatus: user.accountStatus,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: SAFE_USER_SELECT });
    if (!user) throw new UnauthorizedException('Akun tidak tersedia.');
    return { success: true, data: { user } };
  }

  async updateProfile(userId: string, input: UpdateProfileDto) {
    const data = {
      ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
      ...(input.username !== undefined ? { username: input.username.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.profilePhotoUrl !== undefined ? { profilePhotoUrl: input.profilePhotoUrl?.trim() || null } : {}),
    };
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Minimal satu field profil harus diisi.');
    }
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: SAFE_USER_SELECT,
      });
      return { success: true, data: { user } };
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('Username atau email sudah digunakan.');
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
        throw new UnauthorizedException('Akun tidak tersedia.');
      }
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Password saat ini tidak sesuai.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
      select: { id: true },
    });
    return { success: true, message: 'Password berhasil diubah.' };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
