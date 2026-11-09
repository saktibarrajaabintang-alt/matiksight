import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type LoginTicket } from 'google-auth-library';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleTokenVerifier } from './google-token-verifier';

describe('GoogleTokenVerifier', () => {
  const config = new ConfigService({ GOOGLE_CLIENT_ID: 'web-client-id' });
  const client = new OAuth2Client();
  const verifier = new GoogleTokenVerifier(config, client);
  const payload = {
    sub: 'google-subject-123',
    email: 'Analyst@Example.com',
    email_verified: true,
    name: 'Analyst One',
    picture: 'https://example.com/avatar.png',
  };

  afterEach(() => jest.restoreAllMocks());

  it('verifies tokens against the configured audience and returns a normalized identity', async () => {
    const verify = jest.spyOn(client, 'verifyIdToken').mockResolvedValue({
      getPayload: () => payload,
    } as unknown as LoginTicket);

    await expect(verifier.verify('google-id-token')).resolves.toEqual({
      subject: payload.sub,
      email: 'analyst@example.com',
      fullName: payload.name,
      profilePhotoUrl: payload.picture,
    });
    expect(verify).toHaveBeenCalledWith({
      idToken: 'google-id-token',
      audience: 'web-client-id',
    });
  });

  it('rejects Google identities without a verified email', async () => {
    jest.spyOn(client, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({ ...payload, email_verified: false }),
    } as unknown as LoginTicket);

    await expect(verifier.verify('google-id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects invalid ID tokens without returning their contents', async () => {
    jest
      .spyOn(client, 'verifyIdToken')
      .mockRejectedValue(new Error('Invalid token signature'));

    await expect(
      verifier.verify('sensitive-google-id-token'),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Token Google tidak valid.',
    });
  });

  it('reports verifier outages without exposing provider error details', async () => {
    const outage = Object.assign(new Error('provider response detail'), {
      name: 'GaxiosError',
    });
    jest.spyOn(client, 'verifyIdToken').mockRejectedValue(outage);

    await expect(verifier.verify('google-id-token')).rejects.toMatchObject({
      status: 503,
      message: 'Layanan verifikasi Google tidak tersedia.',
    });
  });

  it('fails closed when the Google client ID is not configured', async () => {
    const verify = jest.spyOn(client, 'verifyIdToken');
    const unconfigured = new GoogleTokenVerifier(new ConfigService({}), client);

    await expect(unconfigured.verify('google-id-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(verify).not.toHaveBeenCalled();
  });
});
