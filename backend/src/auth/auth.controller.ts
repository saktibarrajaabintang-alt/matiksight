import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { ApiEndpointDocs, ApiJsonRequest } from '../swagger/api-contract';

@Controller('auth')
@ApiTags('authentication')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  @ApiEndpointDocs({
    summary: 'Register an account',
    description: 'Creates an account. Public endpoint, limited to 5 requests per IP per 15 minutes. Passwords may contain at most 72 UTF-8 bytes.',
    successStatus: 201,
    successDescription: 'Account created; password hash is never returned.',
    successExample: { success: true, data: { user: { id: '<uuid>', username: 'analyst01', email: 'analyst@example.com', createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } } },
    errors: [400, 409, 429, 500],
  })
  @ApiJsonRequest({
    type: 'object', required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]{3,30}$' },
      email: { type: 'string', format: 'email', maxLength: 254 },
      password: { type: 'string', format: 'password', minLength: 8, maxLength: 72, description: 'Maximum 72 UTF-8 bytes.' },
    },
  }, { username: 'analyst01', email: 'analyst@example.com', password: 'secure-pass-123' })
  register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @ApiEndpointDocs({
    summary: 'Log in',
    description: 'Authenticates by username or email. Public endpoint, limited to 10 requests per IP per 15 minutes.',
    successStatus: 201,
    successDescription: 'Returns a one-hour Bearer token and public user profile.',
    successExample: { success: true, data: { accessToken: '<JWT>', tokenType: 'Bearer', expiresIn: '1h', user: { id: '<uuid>', username: 'analyst01', email: 'analyst@example.com', createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } } },
    errors: [400, 401, 429, 500],
  })
  @ApiJsonRequest({
    type: 'object', required: ['identifier', 'password'],
    properties: {
      identifier: { type: 'string', minLength: 1, maxLength: 254, description: 'Username or email.' },
      password: { type: 'string', format: 'password', minLength: 1, maxLength: 72, description: 'Maximum 72 UTF-8 bytes.' },
    },
  }, { identifier: 'analyst01', password: 'secure-pass-123' })
  login(@Body() input: LoginDto) {
    return this.auth.login(input.identifier, input.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiEndpointDocs({
    summary: 'Get current account',
    description: 'Returns the account identified by the Bearer JWT.',
    successStatus: 200,
    successDescription: 'Public profile; no password hash.',
    successExample: { success: true, data: { user: { id: '<uuid>', username: 'analyst01', email: 'analyst@example.com', createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } } },
    errors: [401, 500],
  })
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.user.id);
  }
}
