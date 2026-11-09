import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { TokenPayload } from 'google-auth-library';

export type GoogleIdentity = {
  subject: string;
  email: string;
  fullName: string | null;
  profilePhotoUrl: string | null;
};

@Injectable()
export class GoogleTokenVerifier {
  constructor(
    private readonly config: ConfigService,
    private readonly client: OAuth2Client,
  ) {}

  async verify(idToken: string): Promise<GoogleIdentity> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Login Google belum dikonfigurasi.',
      );
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      if (error instanceof Error && error.name !== 'GaxiosError') {
        throw new UnauthorizedException('Token Google tidak valid.');
      }
      throw new ServiceUnavailableException(
        'Layanan verifikasi Google tidak tersedia.',
      );
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException(
        'Token Google tidak valid atau email belum terverifikasi.',
      );
    }

    return {
      subject: payload.sub,
      email: payload.email.trim().toLowerCase(),
      fullName: payload.name?.trim().slice(0, 120) || null,
      profilePhotoUrl: this.httpsUrl(payload.picture),
    };
  }

  private httpsUrl(value: string | undefined): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.toString() : null;
    } catch {
      return null;
    }
  }
}
