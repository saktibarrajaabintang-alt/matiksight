"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../prisma/prisma.service");
const SAFE_USER_SELECT = { id: true, username: true, email: true, createdAt: true, updatedAt: true };
let AuthService = class AuthService {
    prisma;
    jwt;
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async register(input) {
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
        }
        catch (error) {
            if (this.isUniqueViolation(error))
                throw new common_1.ConflictException('Username atau email sudah digunakan.');
            throw error;
        }
    }
    async login(identifier, password) {
        const normalized = identifier.trim();
        const user = await this.prisma.user.findFirst({
            where: { OR: [{ username: normalized }, { email: normalized.toLowerCase() }] },
        });
        const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
        if (!valid || !user)
            throw new common_1.UnauthorizedException('Username/email atau password salah.');
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
    async me(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: SAFE_USER_SELECT });
        if (!user)
            throw new common_1.UnauthorizedException('Akun tidak tersedia.');
        return { success: true, data: { user } };
    }
    isUniqueViolation(error) {
        return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map