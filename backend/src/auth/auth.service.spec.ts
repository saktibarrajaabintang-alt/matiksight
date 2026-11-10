import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import {
  GoogleTokenVerifier,
  type GoogleIdentity,
} from './google-token-verifier';

const identity: GoogleIdentity = {
  subject: 'google-subject-123',
  email: 'analyst@example.com',
  fullName: 'Analyst One',
  profilePhotoUrl: 'https://example.com/avatar.png',
};

const makeUser = (
  overrides: Partial<{
    id: string;
    fullName: string | null;
    username: string;
    email: string;
    googleSubject: string | null;
    passwordHash: string | null;
    profilePhotoUrl: string | null;
    accountStatus: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: 'user-id',
  fullName: 'Analyst One',
  username: 'analyst01',
  email: identity.email,
  googleSubject: identity.subject,
  passwordHash: 'unreturned-password-hash',
  profilePhotoUrl: identity.profilePhotoUrl,
  accountStatus: 'active',
  createdAt: new Date('2026-11-09T00:00:00.000Z'),
  updatedAt: new Date('2026-11-09T00:00:00.000Z'),
  ...overrides,
});

describe('AuthService Google login', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('matik-sight-jwt') };
  const googleTokens = { verify: jest.fn().mockResolvedValue(identity) };
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    googleTokens.verify.mockResolvedValue(identity);
    jwt.signAsync.mockResolvedValue('matik-sight-jwt');
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: GoogleTokenVerifier, useValue: googleTokens },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('returns the local login response contract for a previously linked Google identity', async () => {
    const user = makeUser();
    prisma.user.findUnique.mockResolvedValueOnce(user);

    await expect(service.googleLogin('google-id-token')).resolves.toEqual({
      success: true,
      data: {
        accessToken: 'matik-sight-jwt',
        tokenType: 'Bearer',
        expiresIn: '1h',
        user: {
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          profilePhotoUrl: user.profilePhotoUrl,
          accountStatus: user.accountStatus,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { googleSubject: identity.subject },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: user.id });
  });

  it('does not implicitly link a Google identity to an existing local account', async () => {
    const localUser = makeUser({ googleSubject: null });
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(localUser);

    await expect(service.googleLogin('google-id-token')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('links a Google identity only from the authenticated account with a matching verified email', async () => {
    const localUser = makeUser({ googleSubject: null });
    prisma.user.findUnique
      .mockResolvedValueOnce(localUser)
      .mockResolvedValueOnce(null);
    prisma.user.update.mockResolvedValueOnce({
      ...localUser,
      googleSubject: identity.subject,
    });

    await expect(
      service.linkGoogleAccount(localUser.id, 'google-id-token'),
    ).resolves.toEqual({
      success: true,
      message: 'Akun Google berhasil ditautkan.',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: localUser.id },
      data: { googleSubject: identity.subject },
    });
  });

  it('rejects linking when the Google email differs from the signed-in account', async () => {
    googleTokens.verify.mockResolvedValueOnce({
      ...identity,
      email: 'different@example.com',
    });
    prisma.user.findUnique.mockResolvedValueOnce(
      makeUser({ googleSubject: null }),
    );

    await expect(
      service.linkGoogleAccount('user-id', 'google-id-token'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects linking a Google identity owned by another user', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(makeUser({ googleSubject: null }))
      .mockResolvedValueOnce(makeUser({ id: 'another-user-id' }));

    await expect(
      service.linkGoogleAccount('user-id', 'google-id-token'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('creates a Google account with a unique username and no local password', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...makeUser(),
        ...data,
        id: 'new-user-id',
        createdAt: new Date('2026-11-09T00:00:00.000Z'),
        updatedAt: new Date('2026-11-09T00:00:00.000Z'),
      }),
    );

    await service.googleLogin('google-id-token');

    const createCall = prisma.user.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data.googleSubject).toBe(identity.subject);
    expect(createCall.data.email).toBe(identity.email);
    expect(createCall.data.username).toMatch(/^analyst_[a-f0-9]{8}$/);
    expect(createCall.data.passwordHash).toBeNull();
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'new-user-id' });
  });

  it('does not authenticate a Google-only account through local password login', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(
      makeUser({ passwordHash: null }),
    );

    await expect(
      service.login(identity.email, 'any-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not log in an inactive Google account', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(
      makeUser({ accountStatus: 'disabled' }),
    );

    await expect(service.googleLogin('google-id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('does not reveal or link an inactive local account matching a Google email', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeUser({ googleSubject: null, accountStatus: 'disabled' }),
      );

    await expect(service.googleLogin('google-id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('does not automatically sign in a local account linked to a different Google identity', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeUser({ googleSubject: 'different-google-subject' }),
      );

    await expect(service.googleLogin('google-id-token')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('limits account creation retries when generated usernames collide', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.googleLogin('google-id-token')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.user.create).toHaveBeenCalledTimes(5);
  });
});
