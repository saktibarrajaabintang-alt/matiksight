ALTER TABLE "users"
    ADD COLUMN "full_name" VARCHAR(120),
    ADD COLUMN "profile_photo_url" VARCHAR(2048),
    ADD COLUMN "account_status" VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE "datasets"
    ADD COLUMN "mime_type" VARCHAR(127),
    ADD COLUMN "storage_key" VARCHAR(80),
    ADD COLUMN "processing_status" VARCHAR(20) NOT NULL DEFAULT 'processed';

CREATE UNIQUE INDEX "datasets_storage_key_key" ON "datasets"("storage_key");

CREATE TABLE "uploaded_files" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(80) NOT NULL,
    "file_type" VARCHAR(10) NOT NULL,
    "mime_type" VARCHAR(127) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uploaded_files_storage_key_key" ON "uploaded_files"("storage_key");
CREATE INDEX "uploaded_files_user_id_created_at_idx" ON "uploaded_files"("user_id", "created_at");

ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
