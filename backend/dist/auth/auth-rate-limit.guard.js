"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const POLICIES = {
    register: { limit: 5, windowMs: 15 * 60 * 1000 },
    login: { limit: 10, windowMs: 15 * 60 * 1000 },
};
const MAX_TRACKED_CLIENTS = 10_000;
let AuthRateLimitGuard = class AuthRateLimitGuard {
    windows = new Map();
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const route = request.route?.path;
        if (typeof route !== 'string' || !route.endsWith('/register') && !route.endsWith('/login')) {
            return true;
        }
        const endpoint = route.endsWith('/register') ? 'register' : 'login';
        const policy = POLICIES[endpoint];
        const now = Date.now();
        const key = `${request.ip}:${endpoint}`;
        let window = this.windows.get(key);
        if (!window || window.resetAt <= now) {
            if (!window && this.windows.size >= MAX_TRACKED_CLIENTS)
                this.pruneExpired(now);
            if (!window && this.windows.size >= MAX_TRACKED_CLIENTS) {
                const oldestKey = this.windows.keys().next().value;
                if (oldestKey)
                    this.windows.delete(oldestKey);
            }
            window = { count: 0, resetAt: now + policy.windowMs };
            this.windows.set(key, window);
        }
        if (window.count >= policy.limit) {
            const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
            const response = context.switchToHttp().getResponse();
            response?.setHeader?.('Retry-After', String(retryAfter));
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                message: 'Terlalu banyak percobaan. Coba lagi setelah beberapa saat.',
                error: 'Too Many Requests',
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        window.count += 1;
        return true;
    }
    pruneExpired(now) {
        for (const [key, window] of this.windows) {
            if (window.resetAt <= now)
                this.windows.delete(key);
        }
    }
};
exports.AuthRateLimitGuard = AuthRateLimitGuard;
exports.AuthRateLimitGuard = AuthRateLimitGuard = __decorate([
    (0, common_1.Injectable)()
], AuthRateLimitGuard);
//# sourceMappingURL=auth-rate-limit.guard.js.map