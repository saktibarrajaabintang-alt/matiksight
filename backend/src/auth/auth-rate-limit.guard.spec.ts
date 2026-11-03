import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

function contextFor(path: string, ip = '127.0.0.1') {
  const response = { setHeader: jest.fn() };
  const request = { route: { path }, ip };
  return {
    response,
    context: {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ExecutionContext,
  };
}

describe('AuthRateLimitGuard', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('limits login attempts per client and returns Retry-After metadata', () => {
    const guard = new AuthRateLimitGuard();
    const { context, response } = contextFor('/auth/login');
    for (let attempt = 0; attempt < 10; attempt += 1) expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    try { guard.canActivate(context); } catch (error) { expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS); }
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '900');
  });

  it('uses a separate registration limit and resets after its window', () => {
    const guard = new AuthRateLimitGuard();
    const { context } = contextFor('/auth/register');
    for (let attempt = 0; attempt < 5; attempt += 1) expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(guard.canActivate(context)).toBe(true);
  });
});
