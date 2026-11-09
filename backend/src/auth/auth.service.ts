import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { GoogleTokenVerifier, type GoogleIdentity } from './google-token-verifier';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly googleTokens: GoogleTokenVerifier,
  ) {}

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
    return this.createLoginResponse(user);
  }

  async googleLogin(idToken: string) {
    const identity = await this.googleTokens.verify(idToken);
    let user = await this.prisma.user.findUnique({ where: { googleSubject: identity.subject } });
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email: identity.email } });
      if (user) {
        if (user.accountStatus !== 'active') {
          throw new UnauthorizedException('Token Google tidak valid atau akun tidak aktif.');
        }
        throw new ConflictException('Email Google sudah digunakan. Masuk dengan akun lokal, lalu tautkan Google dari sesi terautentikasi.');
      }
      user = await this.createGoogleAccount(identity);
    }
    if (!user || user.accountStatus !== 'active') {
      throw new UnauthorizedException('Token Google tidak valid atau akun tidak aktif.');
    }
    return this.createLoginResponse(user);
  }

  async linkGoogleAccount(userId: string, idToken: string) {
    const identity = await this.googleTokens.verify(idToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'active') {
      throw new UnauthorizedException('Akun tidak tersedia.');
    }
    if (user.googleSubject === identity.subject) {
      return { success: true, message: 'Akun Google berhasil ditautkan.' };
    }
    if (user.email.toLowerCase() !== identity.email) {
      throw new ConflictException('Email Google harus sama dengan email akun MatikSight.');
    }
    const linkedUser = await this.prisma.user.findUnique({ where: { googleSubject: identity.subject } });
    if (linkedUser && linkedUser.id !== user.id) {
      throw new ConflictException('Akun Google sudah ditautkan ke akun MatikSight lain.');
    }
    if (user.googleSubject) {
      throw new ConflictException('Akun MatikSight sudah ditautkan ke akun Google lain.');
    }
    if (!user.googleSubject) {
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { googleSubject: identity.subject },
        });
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          throw new ConflictException('Akun Google sudah ditautkan ke akun MatikSight lain.');
        }
        throw error;
      }
    }
    return { success: true, message: 'Akun Google berhasil ditautkan.' };
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

  private async createGoogleAccount(identity: GoogleIdentity) {
    const stem = identity.email.split('@')[0]
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 20) || 'googleuser';
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.user.create({
          data: {
            fullName: identity.fullName,
            username: `${stem}_${randomBytes(4).toString('hex')}`,
            email: identity.email,
            googleSubject: identity.subject,
            passwordHash,
            profilePhotoUrl: identity.profilePhotoUrl,
          },
        });
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error;
        const bySubject = await this.prisma.user.findUnique({ where: { googleSubject: identity.subject } });
        if (bySubject) return bySubject;
        const byEmail = await this.prisma.user.findUnique({ where: { email: identity.email } });
        if (byEmail) {
          if (byEmail.accountStatus !== 'active') {
            throw new UnauthorizedException('Token Google tidak valid atau akun tidak aktif.');
          }
          throw new ConflictException('Email Google sudah digunakan. Masuk dengan akun lokal, lalu tautkan Google dari sesi terautentikasi.');
        }
      }
    }
    throw new ConflictException('Akun Google tidak dapat dibuat saat ini.');
  }

  private async createLoginResponse(user: User) {
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
}
