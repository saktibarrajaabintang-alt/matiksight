CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "datasets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(10) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "row_count" INTEGER NOT NULL,
    "column_count" INTEGER NOT NULL,
    "columns" JSONB NOT NULL,
    "column_metadata" JSONB NOT NULL,
    "profiling" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dataset_rows" (
    "id" BIGSERIAL NOT NULL,
    "dataset_id" UUID NOT NULL,
    "row_index" INTEGER NOT NULL,
    "values" JSONB NOT NULL,
    CONSTRAINT "dataset_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "datasets_user_id_created_at_idx" ON "datasets"("user_id", "created_at");
CREATE UNIQUE INDEX "dataset_rows_dataset_id_row_index_key" ON "dataset_rows"("dataset_id", "row_index");

ALTER TABLE "datasets" ADD CONSTRAINT "datasets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dataset_rows" ADD CONSTRAINT "dataset_rows_dataset_id_fkey"
  FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
