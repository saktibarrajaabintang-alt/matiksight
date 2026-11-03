import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AuthRateLimitGuard implements CanActivate {
    private readonly windows;
    canActivate(context: ExecutionContext): boolean;
    private pruneExpired;
}
