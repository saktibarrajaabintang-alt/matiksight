# Database schema

The production schema is PostgreSQL, accessed through Prisma. Migrations are
additive and are located in `prisma/migrations/`; do not reset or truncate an
existing database.

## Tables

| Table | Purpose and key fields |
| --- | --- |
| `users` | `id` UUID primary key; unique `username` and `email`; nullable `password_hash` for Google-only accounts; nullable unique `google_subject`; nullable `full_name` and `profile_photo_url`; `account_status` defaults to `active`; created/updated timestamps. |
| `datasets` | Owner FK, display `name`, `original_filename`, extension/MIME/file size, row/column counts, JSONB schema/profile, nullable opaque `storage_key`, and `processing_status`. Existing rows keep `storage_key = NULL`. |
| `dataset_rows` | Dataset FK, unique `(dataset_id, row_index)`, JSONB row values; supports paged preview and analysis without a single large JSON document. |
| `uploaded_files` | User FK, original filename, opaque unique `storage_key`, type/MIME/size and creation timestamp; used by `/upload`. |
| `saved_visualizations` | Owner and dataset FKs, chart type, validated JSONB configuration, name/description and timestamps. |
| `saved_reports` | Owner and dataset FKs, JSONB configuration and optional snapshot, name/description and timestamps. |

## Relationships and indexes

- `users` has many `datasets`, `uploaded_files`, `saved_visualizations`, and
  `saved_reports`.
- `datasets` has many `dataset_rows`, visualizations, and reports.
- User and dataset foreign keys use `ON DELETE CASCADE`.
- Dataset listing has `(user_id, created_at)` index; rows have unique
  `(dataset_id, row_index)`; artifact lists have `(user_id, created_at)` and
  dataset indexes; uploaded files have `(user_id, created_at)`.
- Storage keys are unique and never returned in API responses. The actual
  storage directory is configured outside PostgreSQL.

## Migrations

1. `20261103000000_init`: users, datasets, and normalized rows.
2. `20261103010000_saved_artifacts`: saved visualizations and reports.
3. `20261104000000_profiles_and_file_storage`: profile fields, dataset file
   metadata, and uploaded files.
4. `20261109160000_add_google_subject`: nullable unique Google identity
   subject.
5. `20261109210000_allow_google_only_accounts_without_password`: allows
   `password_hash` to be null so Google-only accounts cannot use a generated
   local password.

The third migration adds nullable columns for existing user/dataset records,
and defaults the new account status and processing status. It does not move or
delete existing data. Since previous dataset records did not retain the
original file, downloads for those legacy records return 404 until a source
file is uploaded again.
