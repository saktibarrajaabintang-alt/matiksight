# Backend setup

## Requirements

- Node.js compatible with the project's TypeScript/NestJS dependencies
- PostgreSQL
- A writable, persistent private directory for uploaded files in production

## Local development

1. In `matiksight/backend`, copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a PostgreSQL database and `JWT_SECRET` to a random
   secret of at least 32 characters. Keep `.env` private and untracked.
3. Install dependencies and generate Prisma Client:

   ```sh
   npm install
   npm run prisma:generate
   ```

4. For a new local database, apply development migrations:

   ```sh
   npm run prisma:migrate
   ```

   For an existing database, inspect and back up it first; do not reset it.
5. Start the server:

   ```sh
   npm run start:dev
   ```

Swagger is at `http://localhost:3000/api`; the API routes themselves are rooted
at `http://localhost:3000` (for example `/auth/login`).

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL. |
| `JWT_SECRET` | Yes | At least 32 characters; never commit the real value. |
| `CORS_ORIGINS` | No | Comma-separated exact browser origins; empty disables cross-origin access. |
| `DATA_STORAGE_DIR` | No | Private upload directory; defaults to `storage` under the backend working directory. |
| `PORT` | No | HTTP port; defaults to 3000. |

Uploads are stored under opaque UUID names with restrictive file permissions.
In production, configure `DATA_STORAGE_DIR` to a durable mounted volume, keep it
outside any static/public directory, and include it in backup/restore
procedures. Container-local ephemeral storage is not durable. Storage keys and
filesystem paths must not be exposed to clients.

## Production

1. Build and generate Prisma Client from the reviewed schema.
2. Back up PostgreSQL and the configured upload volume.
3. Review the additive migrations and deploy them with:

   ```sh
   npm run prisma:deploy
   ```

4. Set production secrets and the durable storage volume; allow only trusted
   origins in `CORS_ORIGINS`.
5. Start with `npm run start:prod`.

The development database configured for this workspace is `matiksight_dev` on
the local PostgreSQL server; its migrations have been applied. Production
databases must be backed up and migrated separately. Existing datasets created
before file storage have no source file to restore; their metadata and parsed
rows remain intact.

## Verification commands

```sh
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

PostgreSQL integration tests require a separately provisioned
`TEST_DATABASE_URL`; the test setup refuses to use the configured application
database as the test target.

## Frontend connection

The Next.js frontend is configured to run at `http://localhost:3001` and call
the backend at `http://localhost:3000` by default. Copy the frontend
`.env.example` to `.env.local` if the backend runs at a different origin, and
set `NEXT_PUBLIC_API_URL`. The backend `.env` must allow the exact frontend
origin in `CORS_ORIGINS`, for example `http://localhost:3001`.

The frontend authenticates with bearer tokens, uploads CSV/XLS/XLSX files using
the multipart field `file`, and loads datasets, previews, visualizations, and
reports through the authenticated API. Theme and table preferences remain
local to the browser. Do not use the development database or local storage as a
production persistence strategy.
