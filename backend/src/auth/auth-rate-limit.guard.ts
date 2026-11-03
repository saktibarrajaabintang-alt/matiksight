import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

type RateWindow = { count: number; resetAt: number };
type AuthRoute = 'register' | 'login';

const POLICIES: Record<AuthRoute, { limit: number; windowMs: number }> = {
  register: { limit: 5, windowMs: 15 * 60 * 1000 },
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
};
const MAX_TRACKED_CLIENTS = 10_000;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, RateWindow>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const route = request.route?.path;
    if (typeof route !== 'string' || !route.endsWith('/register') && !route.endsWith('/login')) {
      return true;
    }

    const endpoint: AuthRoute = route.endsWith('/register') ? 'register' : 'login';
    const policy = POLICIES[endpoint];
    const now = Date.now();
    const key = `${request.ip}:${endpoint}`;
    let window = this.windows.get(key);

    if (!window || window.resetAt <= now) {
      if (!window && this.windows.size >= MAX_TRACKED_CLIENTS) this.pruneExpired(now);
      if (!window && this.windows.size >= MAX_TRACKED_CLIENTS) {
        const oldestKey = this.windows.keys().next().value;
        if (oldestKey) this.windows.delete(oldestKey);
      }
      window = { count: 0, resetAt: now + policy.windowMs };
      this.windows.set(key, window);
    }

    if (window.count >= policy.limit) {
      const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
      const response = context.switchToHttp().getResponse<{ setHeader?: (name: string, value: string) => void }>();
      response?.setHeader?.('Retry-After', String(retryAfter));
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Terlalu banyak percobaan. Coba lagi setelah beberapa saat.',
        error: 'Too Many Requests',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    window.count += 1;
    return true;
  }

  private pruneExpired(now: number) {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}
