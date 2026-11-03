import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
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
    login(input: LoginDto): Promise<{
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
    me(request: AuthenticatedRequest): Promise<{
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
}
