import { parse } from 'dotenv';

type DatabaseIdentity = { host: string; port: string; database: string };

function identityOf(value: string, label: string): DatabaseIdentity {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL connection URL.`);
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error(`${label} must be a valid PostgreSQL connection URL.`);
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database) throw new Error(`${label} must identify a PostgreSQL database.`);
  return { host: parsed.hostname.toLowerCase(), port: parsed.port || '5432', database };
}

function sameDatabase(left: DatabaseIdentity, right: DatabaseIdentity) {
  return left.host === right.host && left.port === right.port && left.database === right.database;
}

export function assertIsolatedPostgresTestTarget(
  testDatabaseUrl: string | undefined,
  processDatabaseUrl: string | undefined,
  dotenvText: string | undefined,
) {
  if (!testDatabaseUrl?.trim()) {
    throw new Error('TEST_DATABASE_URL is required to run PostgreSQL integration tests.');
  }

  const target = identityOf(testDatabaseUrl, 'TEST_DATABASE_URL');
  let dotenvDatabaseUrl: string | undefined;
  if (dotenvText !== undefined) {
    try {
      dotenvDatabaseUrl = parse(dotenvText).DATABASE_URL;
    } catch {
      throw new Error('Could not safely read DATABASE_URL from the backend .env file.');
    }
  }

  const applicationUrls = [processDatabaseUrl, dotenvDatabaseUrl].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  if (applicationUrls.length === 0) {
    throw new Error('Cannot verify test database isolation: DATABASE_URL is absent from process environment and backend .env.');
  }

  for (const applicationUrl of applicationUrls) {
    if (sameDatabase(target, identityOf(applicationUrl, 'Application DATABASE_URL'))) {
      throw new Error('TEST_DATABASE_URL resolves to the application database; use a separate PostgreSQL database.');
    }
  }

  if (!/(^|[_-])test($|[_-])/i.test(target.database)) {
    throw new Error('TEST_DATABASE_URL must point to a dedicated test database (name must contain a test segment).');
  }

  return target;
}
