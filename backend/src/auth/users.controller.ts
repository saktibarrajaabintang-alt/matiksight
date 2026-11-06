import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ApiEndpointDocs, ApiJsonRequest } from '../swagger/api-contract';

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @ApiEndpointDocs({
    summary: 'Get current user profile',
    description: 'Requires a bearer token; returns the caller profile without password data.',
    successStatus: 200,
    successDescription: 'Returns only the authenticated user profile.',
    successExample: { success: true, data: { user: { id: '<uuid>', fullName: null, username: 'analyst01', email: 'analyst@example.com', profilePhotoUrl: null, accountStatus: 'active' } } },
    errors: [401, 500],
  })
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.user.id);
  }

  @Patch('me')
  @ApiJsonRequest({
    type: 'object',
    minProperties: 1,
    properties: {
      fullName: { type: 'string', minLength: 1, maxLength: 120 },
      username: { type: 'string', pattern: '^[a-zA-Z0-9_]{3,30}$' },
      email: { type: 'string', format: 'email', maxLength: 254 },
      profilePhotoUrl: { type: 'string', maxLength: 2048, nullable: true },
    },
  }, { fullName: 'Analyst One' })
  @ApiEndpointDocs({
    summary: 'Update current user profile',
    description: 'Requires a bearer token. Username and email remain unique; profile photo values must be HTTPS URLs.',
    successStatus: 200,
    successDescription: 'Returns the updated public profile.',
    successExample: { success: true, data: { user: { id: '<uuid>', fullName: 'Analyst One', username: 'analyst01', email: 'analyst@example.com', profilePhotoUrl: null, accountStatus: 'active' } } },
    errors: [400, 401, 409, 500],
  })
  update(@Req() request: AuthenticatedRequest, @Body() input: UpdateProfileDto) {
    return this.auth.updateProfile(request.user.id, input);
  }

  @Patch('me/password')
  @ApiJsonRequest({
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', format: 'password', minLength: 1, maxLength: 72 },
      newPassword: { type: 'string', format: 'password', minLength: 8, maxLength: 72 },
    },
  }, { currentPassword: 'current-password', newPassword: 'new-secure-pass-456' })
  @ApiEndpointDocs({
    summary: 'Change current user password',
    description: 'Requires a bearer token and the current password. Both passwords are limited to 72 UTF-8 bytes.',
    successStatus: 200,
    successDescription: 'Password changed; existing bearer tokens expire normally.',
    successExample: { success: true, message: 'Password berhasil diubah.' },
    errors: [400, 401, 500],
  })
  changePassword(@Req() request: AuthenticatedRequest, @Body() input: ChangePasswordDto) {
    return this.auth.changePassword(request.user.id, input.currentPassword, input.newPassword);
  }
}
