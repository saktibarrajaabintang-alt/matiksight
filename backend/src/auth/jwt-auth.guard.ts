import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUser } from './auth-user.interface';

export type AuthenticatedRequest = Request & { user: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Bearer token wajib diisi.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
      if (!payload.sub) throw new Error('Invalid subject');
      request.user = { id: payload.sub, username: '', email: '' };
      return true;
    } catch {
      throw new UnauthorizedException('Token tidak valid atau sudah kedaluwarsa.');
    }
  }
}
