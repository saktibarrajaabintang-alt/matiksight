# API documentation

The API uses the existing root route scheme (for example, `/auth/login`), not
an `/api` route prefix. Swagger UI is available at `/api`; its OpenAPI document
is at `/api-json`. Protected routes accept `Authorization: Bearer <token>`.
Times are ISO-8601 values returned by PostgreSQL/Prisma.

## Authentication and users

| Method | Path | Auth | Request |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public; 5/IP/15 min | `{ "username": "analyst01", "email": "analyst@example.com", "password": "secure-pass-123", "fullName": "Analyst One" }` (`fullName` optional for compatibility) |
| POST | `/auth/login` | Public; 10/IP/15 min | `{ "identifier": "analyst01", "password": "secure-pass-123" }` |
| POST | `/auth/logout` | Bearer | No body. Client must discard its token; JWT is stateless and expires after one hour. |
| GET | `/auth/me` | Bearer | Current public profile. |
| GET | `/users/me` | Bearer | Current public profile. |
| PATCH | `/users/me` | Bearer | Any of `fullName`, `username`, `email`, or an HTTPS `profilePhotoUrl`. |
| PATCH | `/users/me/password` | Bearer | `{ "currentPassword": "...", "newPassword": "..." }`. |

Registration requires a 3–30 character alphanumeric/underscore username, valid
email, and 8–72 UTF-8-byte password. Duplicate username/email returns 409.
Profile responses omit password hashes. An inactive account cannot log in.

## Datasets

Upload accepts one multipart field named `file`; maximum size is 20 MiB.
Dataset ingestion supports CSV, XLSX and XLS. CSV must be UTF-8; Excel uses its
first worksheet. Upload persists original bytes and parsed rows.

| Method | Path | Request/response |
| --- | --- | --- |
| POST | `/datasets` | Upload dataset; preserves the existing upload response. |
| POST | `/datasets/upload` | Alias for `POST /datasets`. |
| GET | `/datasets` | `page`, `limit`, `search`, `fileType`, `sortBy`, `sortOrder`; returns owner-scoped page and pagination. |
| GET | `/datasets/:id` | Dataset metadata, columns and profiling; internal storage key is omitted. |
| GET | `/datasets/:id/preview` | `page` (default 1), `limit` (default 20, max 100); returns dataset/schema, row `data`, pagination. |
| GET | `/datasets/:id/download` | Original file as an attachment. |
| PATCH | `/datasets/:id` | `{ "name": "New display name" }`; original filename is unchanged. |
| DELETE | `/datasets/:id` | Deletes owned metadata/rows and removes the associated stored file. |

Dataset IDs must be UUIDs. An absent dataset and another user's dataset both
return 404. Page size is at most 100. The list supports sorting by `createdAt`,
`name`, `fileSize`, or `rowCount`.

## Upload assets

The legacy-compatible general upload route accepts CSV, XLSX, XLS, PNG, JPG,
and JPEG (20 MiB maximum), persists metadata and bytes, and returns the original
metadata fields plus an opaque file `id`.

| Method | Path | Request/response |
| --- | --- | --- |
| POST | `/upload` | Authenticated multipart field `file`; returns metadata and ID. |
| GET | `/upload/:id` | Downloads an owned file as an attachment. |
| DELETE | `/upload/:id` | Deletes owned file metadata and stored bytes. |

## Analysis and visualization data

| Method | Path | Request/response |
| --- | --- | --- |
| GET | `/datasets/:id/analysis` | Dynamic profile, statistics, data quality and chart recommendations. |
| POST | `/datasets/:id/analyze` | Alias for the analysis endpoint. |
| POST | `/datasets/:id/aggregate` | `{ groupBy?, metrics, filters?, sort?, limit? }`; returns grouped metric rows. |
| POST | `/datasets/:id/visualizations/data` | `{ chartType, xAxis, yAxis, aggregation?, filters?, sort?, limit? }`; returns chart-ready data. |

Metric operations: `count`, `sum`, `average`, `minimum`, `maximum`,
`distinct_count`. Filter operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`,
`contains`, `in`, `isNull`. Grouping is limited to 3 columns, metrics to 10,
filters to 20, and result rows to 1,000. Analysis scans at most 500,000 rows per
request and returns 413 above that bound. Supported chart types are `bar`,
`line`, `area`, `pie`, `donut`, and `scatter`; invalid columns and incompatible
types return 400.

## Saved visualizations and reports

| Method | Path | Request/response |
| --- | --- | --- |
| POST | `/visualizations` | `{ datasetId, name, description?, configuration }`. |
| GET | `/visualizations` | Paginated, owner-scoped list; optional name `search`. |
| GET | `/visualizations/:id` | Owned visualization configuration. |
| PATCH | `/visualizations/:id` | Update one or more fields; a supplied configuration is validated against its dataset. |
| DELETE | `/visualizations/:id` | Delete owned visualization. |
| POST | `/reports` | `{ datasetId, name, description?, configuration, snapshot? }`. |
| GET | `/reports` | Paginated owner-scoped list (snapshots omitted from list response). |
| GET | `/reports/:id` | Owned report and optional snapshot. |
| PATCH | `/reports/:id` | Update one or more fields. |
| DELETE | `/reports/:id` | Delete owned report. |

Page defaults to 1 and limit defaults to 20 (maximum 100). Configuration and
snapshot sizes are bounded; reports store metadata/configuration, not a copy of
dataset rows.

## Errors and compatibility

DTO/column errors use HTTP 400; missing/foreign-owned resources use 404;
invalid credentials or missing tokens use 401; uniqueness conflicts use 409;
upload/scan limits use 413; unsupported file types use 415; auth throttling uses
429 and `Retry-After`. Unhandled errors return a generic 500 response.
Existing `/datasets`, `/auth`, `/upload`, `/visualizations`, and `/reports`
routes remain available.
