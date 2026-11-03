import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertIsolatedPostgresTestTarget } from './postgres-test-target';

let dotenvText: string | undefined;
try {
  dotenvText = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw new Error('Could not safely read the backend .env file to verify PostgreSQL test isolation.');
  }
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
assertIsolatedPostgresTestTarget(testDatabaseUrl, process.env.DATABASE_URL, dotenvText);

// This runs as a Jest setup file before test modules import PrismaService.
process.env.DATABASE_URL = testDatabaseUrl!;
process.env.JWT_SECRET = `integration-${randomUUID()}-${randomUUID()}`;
