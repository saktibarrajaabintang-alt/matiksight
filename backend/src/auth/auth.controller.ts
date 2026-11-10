import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
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

  @Post('google')
  @UseGuards(AuthRateLimitGuard)
  @ApiEndpointDocs({
    summary: 'Log in with Google',
    description: 'Verifies a Google ID token for GOOGLE_CLIENT_ID and returns the same one-hour MatikSight bearer token and profile as local login. An existing local email is never linked automatically; use POST /auth/google/link with a local bearer token. Google login and linking share a limit of 10 requests per IP per 15 minutes.',
    successStatus: 201,
    successDescription: 'Returns a MatikSight bearer token and public user profile.',
    successExample: { success: true, data: { accessToken: '<JWT>', tokenType: 'Bearer', expiresIn: '1h', user: { id: '<uuid>', fullName: 'Analyst One', username: 'analyst01', email: 'analyst@example.com', profilePhotoUrl: null, accountStatus: 'active', createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } } },
    errors: [400, 401, 409, 429, 503],
  })
  @ApiJsonRequest({
    type: 'object',
    required: ['idToken'],
    properties: {
      idToken: { type: 'string', minLength: 1, maxLength: 8192, description: 'Google OpenID Connect ID token issued for the configured web client.' },
    },
  }, { idToken: '<Google ID token>' })
  googleLogin(@Body() input: GoogleLoginDto) {
    return this.auth.googleLogin(input.idToken);
  }

  @Post('google/link')
  @UseGuards(JwtAuthGuard, AuthRateLimitGuard)
  @ApiBearerAuth()
  @ApiEndpointDocs({
    summary: 'Link a Google identity to the current account',
    description: 'Requires a MatikSight bearer token and a verified Google ID token whose email matches the current account. A Google identity already linked to another account is rejected. Google login and linking share a limit of 10 requests per IP per 15 minutes.',
    successStatus: 201,
    successDescription: 'Google identity linked to the authenticated account.',
    successExample: { success: true, message: 'Akun Google berhasil ditautkan.' },
    errors: [400, 401, 409, 429, 503],
  })
  @ApiJsonRequest({
    type: 'object',
    required: ['idToken'],
    properties: {
      idToken: { type: 'string', minLength: 1, maxLength: 8192, description: 'Google OpenID Connect ID token with a verified email matching the authenticated MatikSight account.' },
    },
  }, { idToken: '<Google ID token>' })
  linkGoogle(@Req() request: AuthenticatedRequest, @Body() input: GoogleLoginDto) {
    return this.auth.linkGoogleAccount(request.user.id, input.idToken);
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

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiEndpointDocs({
    summary: 'Log out the current session',
    description: 'Bearer tokens are stateless; the client must discard its token. Existing tokens expire after one hour.',
    successStatus: 201,
    successDescription: 'Logout acknowledged.',
    successExample: { success: true, message: 'Logout berhasil. Hapus token akses dari client.' },
    errors: [401],
  })
  logout() {
    return { success: true, message: 'Logout berhasil. Hapus token akses dari client.' };
  }
}
