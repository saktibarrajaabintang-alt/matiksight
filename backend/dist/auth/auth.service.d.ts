import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    register(input: RegisterDto): Promise<{
        success: boolean;
        data: {
            user: {
                email: string;
                id: string;
                username: string;
                createdAt: Date;
                updatedAt: Date;
            };
        };
    }>;
    login(identifier: string, password: string): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            tokenType: string;
            expiresIn: string;
            user: {
                id: string;
                username: string;
                email: string;
                createdAt: Date;
                updatedAt: Date;
            };
        };
    }>;
    me(userId: string): Promise<{
        success: boolean;
        data: {
            user: {
                email: string;
                id: string;
                username: string;
                createdAt: Date;
                updatedAt: Date;
            };
        };
    }>;
    private isUniqueViolation;
}
