import { assertIsolatedPostgresTestTarget } from './postgres-test-target';

const applicationUrl = 'postgresql://app:secret@localhost:5432/matiksight?schema=public';

describe('PostgreSQL integration target guard', () => {
  it('requires an explicit test URL and an application URL to compare', () => {
    expect(() => assertIsolatedPostgresTestTarget(undefined, applicationUrl, undefined)).toThrow(/TEST_DATABASE_URL is required/);
    expect(() => assertIsolatedPostgresTestTarget('postgresql://test:secret@localhost:5432/matiksight_test', undefined, undefined)).toThrow(/Cannot verify test database isolation/);
  });

  it('rejects the same database even when the test URL uses different credentials or schema', () => {
    const sameDatabase = 'postgresql://test:other@localhost:5432/matiksight_test?schema=testing';
    const appOnSameDatabase = 'postgresql://app:secret@localhost:5432/matiksight_test?schema=public';
    expect(() => assertIsolatedPostgresTestTarget(sameDatabase, appOnSameDatabase, undefined)).toThrow(/separate PostgreSQL database/);
  });

  it('checks both process and .env database URLs and accepts a distinct target', () => {
    const testUrl = 'postgresql://test:secret@localhost:5432/matiksight_test';
    expect(assertIsolatedPostgresTestTarget(
      testUrl,
      'postgresql://app:secret@localhost:5432/another_db',
      `DATABASE_URL="${applicationUrl}"`,
    )).toEqual({ host: 'localhost', port: '5432', database: 'matiksight_test' });
  });

  it('rejects malformed URLs and names without a test segment', () => {
    expect(() => assertIsolatedPostgresTestTarget('not-a-url', applicationUrl, undefined)).toThrow(/valid PostgreSQL/);
    expect(() => assertIsolatedPostgresTestTarget(
      'postgresql://test:secret@localhost:5432/matiksight',
      'postgresql://app:secret@localhost:5432/another_db',
      undefined,
    )).toThrow(/test database/);
  });
});
