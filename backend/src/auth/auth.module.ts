import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { UsersController } from './users.controller';
import { GoogleTokenVerifier } from './google-token-verifier';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    JwtAuthGuard,
    AuthRateLimitGuard,
    GoogleTokenVerifier,
    { provide: OAuth2Client, useFactory: () => new OAuth2Client() },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
