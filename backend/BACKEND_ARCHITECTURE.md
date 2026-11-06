# Backend architecture

## Current system

MatikSight's backend is a NestJS 12 application written in TypeScript. Prisma 6
provides access to PostgreSQL. `src/main.ts` installs DTO validation, the
sanitized exception filter, environment-driven CORS, and Swagger at `/api`
(OpenAPI JSON at `/api-json`). Controllers use the existing root route scheme;
there is no global `/api` route prefix.

| Area | Existing implementation |
| --- | --- |
| Application | `src/app.module.ts` composes feature modules and validates required database/JWT configuration. |
| Authentication | `src/auth/` registers and authenticates users with bcrypt and one-hour bearer JWTs; `JwtAuthGuard` protects private routes and `AuthRateLimitGuard` limits registration/login. |
| Persistence | `src/prisma/` supplies the shared Prisma client. Schema and additive migrations are in `prisma/`. |
| Datasets | `src/datasets/` validates CSV/XLS/XLSX, profiles dynamic columns, persists rows in JSONB batches, paginates previews, and supports owner-scoped management and analysis. |
| Files | `src/storage/` stores opaque UUID-keyed files beneath `DATA_STORAGE_DIR`. The `/upload` route persists general supported uploads; dataset uploads retain their original file separately from normalized rows. |
| Analysis | `src/datasets/analysis/` performs bounded, in-memory aggregation over paginated database reads; user-provided values are validated rather than interpolated into SQL. |
| Saved artifacts | `src/saved-artifacts/` persists visualizations and reports, including configuration/snapshot size limits and owner checks. |
| Security/API | `src/security/` handles CORS parsing and safe error responses; `src/swagger/` describes the current API contracts. |
| Tests | Jest unit tests live beside source; `test/` contains in-memory e2e and isolated PostgreSQL integration tests. |

## Data flow

1. A protected upload is held in memory by Multer (maximum 20 MiB).
2. The service validates extension, MIME type, size, signature/content and
   parsed workbook structure. Dataset data is profiled before persistence.
3. The original bytes are written with a random, non-user-controlled key to the
   configured private storage directory. Database metadata stores that opaque
   key, not an absolute path or public URL.
4. Dataset metadata and normalized `dataset_rows` are committed in a Prisma
   transaction. If that transaction fails, the newly written file is removed;
   cleanup failures are logged and the request still fails.
5. Reads and mutations filter by both resource ID and authenticated user ID.
   Downloads stream bytes as attachments and never resolve user-provided paths.

Local disk is the current storage driver. Point `DATA_STORAGE_DIR` at a durable,
private volume in production; an ephemeral container filesystem does not meet
the persistence requirement. The storage provider is isolated behind
`FileStorageService` so a cloud-backed implementation can replace it without
changing dataset or upload controllers.

## Requirements checklist

| Capability | Status | Notes |
| --- | --- | --- |
| Register/login/current user | Implemented | Passwords use bcrypt; safe profile fields only are returned. |
| Logout | Partial | Stateless bearer JWTs are acknowledged at logout; clients discard tokens. Tokens remain valid until expiry (one hour). |
| Profile and password updates | Implemented | Owner is derived from the JWT; current password is required for password changes. |
| Durable dataset and upload files | Implemented for new uploads | Files survive process restarts when the configured storage volume is durable. Existing database datasets have no recoverable source file and cannot be downloaded. |
| CSV/XLS/XLSX parsing | Implemented | First worksheet is read. The 20 MiB request cap bounds memory use; processing is not a streaming parser. |
| Image uploads and retrieval | Implemented | The general `/upload` API stores and owner-protects PNG/JPG/JPEG files. OCR is not provided. |
| Dataset list/detail/preview/rename/download/delete | Implemented | List includes pagination, search, type filtering and sorting; dataset deletion cascades database rows and removes the file. |
| Analysis and chart data | Implemented | Dynamic columns, SUM/COUNT/AVERAGE/MIN/MAX/distinct count, filters, grouping, and bar/line/area/pie/donut/scatter output. Each scan is capped at 500,000 rows. |
| Saved reports and visualizations | Implemented | PostgreSQL-backed, owner-scoped records; dataset deletion cascades related artifacts. |
| Frontend integration | Partial | The API is documented and Swagger is available. The current Next.js UI still uses browser-local state and is not wired to these endpoints. |
| Sessions/token revocation | Not implemented | There is no server-side session registry or token denylist. |
| Profile image upload | Partial | A profile may store an HTTPS image URL; upload/resize/avatar association is not implemented. |

## Persistence and migration safety

The migration `20261104000000_profiles_and_file_storage` only adds nullable
profile/storage metadata, defaults new account status to `active`, and creates
the uploaded-file table and indexes. It does not drop or rewrite existing
records. The migration has not been applied to any database as part of this
change. Review and back up the target database before deploying migrations.
