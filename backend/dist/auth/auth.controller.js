"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const login_dto_1 = require("./dto/login.dto");
const register_dto_1 = require("./dto/register.dto");
const swagger_1 = require("@nestjs/swagger");
const auth_rate_limit_guard_1 = require("./auth-rate-limit.guard");
const api_contract_1 = require("../swagger/api-contract");
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    register(input) {
        return this.auth.register(input);
    }
    login(input) {
        return this.auth.login(input.identifier, input.password);
    }
    me(request) {
        return this.auth.me(request.user.id);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.UseGuards)(auth_rate_limit_guard_1.AuthRateLimitGuard),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Register an account',
        description: 'Creates an account. Public endpoint, limited to 5 requests per IP per 15 minutes. Passwords may contain at most 72 UTF-8 bytes.',
        successStatus: 201,
        successDescription: 'Account created; password hash is never returned.',
        successExample: { success: true, data: { user: { id: '<uuid>', username: 'analyst01', email: 'analyst@example.com', createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } } },
        errors: [400, 409, 429, 500],
    }),
    (0, api_contract_1.ApiJsonRequest)({
        type: 'object', required: ['username', 'email', 'password'],
        properties: {
            username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]{3,30}$' },
            email: { type: 'string', format: 'email', maxLength: 254 },
            password: { type: 'string', format: 'password', minLength: 8, maxLength: 72, description: 'Maximum 72 UTF-8 bytes.' },
        },
    }, { username: 'analyst01', email: 'analyst@example.com', password: 'secure-pass-123' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.UseGuards)(auth_rate_limit_guard_1.AuthRateLimitGuard),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Log in',
        description: 'Authenticates by username or email. Public endpoint, limited to 10 requests per IP per 15 minutes.',
        successStatus: 201,
        successDescription: 'Returns a one-hour Bearer token and public user profile.',
        successExample: { success: true, data: { accessToken: '<JWT>', tokenType: 'Bearer', expiresIn: '1h', user: { id: '<uuid>', username: 'analyst01', email: 'analyst@example.com', createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } } },
        errors: [400, 401, 429, 500],
    }),
    (0, api_contract_1.ApiJsonRequest)({
        type: 'object', required: ['identifier', 'password'],
        properties: {
            identifier: { type: 'string', minLength: 1, maxLength: 254, description: 'Username or email.' },
            password: { type: 'string', format: 'password', minLength: 1, maxLength: 72, description: 'Maximum 72 UTF-8 bytes.' },
        },
    }, { identifier: 'analyst01', password: 'secure-pass-123' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Get current account',
        description: 'Returns the account identified by the Bearer JWT.',
        successStatus: 200,
        successDescription: 'Public profile; no password hash.',
        successExample: { success: true, data: { user: { id: '<uuid>', username: 'analyst01', email: 'analyst@example.com', createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } } },
        errors: [401, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    (0, swagger_1.ApiTags)('authentication'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map