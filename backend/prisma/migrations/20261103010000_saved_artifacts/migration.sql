CREATE TABLE "saved_visualizations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "dataset_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000),
    "chart_type" VARCHAR(20) NOT NULL,
    "configuration" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_visualizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "dataset_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000),
    "configuration" JSONB NOT NULL,
    "snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_visualizations_user_id_created_at_idx"
    ON "saved_visualizations"("user_id", "created_at");
CREATE INDEX "saved_visualizations_dataset_id_idx"
    ON "saved_visualizations"("dataset_id");
CREATE INDEX "saved_reports_user_id_created_at_idx"
    ON "saved_reports"("user_id", "created_at");
CREATE INDEX "saved_reports_dataset_id_idx"
    ON "saved_reports"("dataset_id");

ALTER TABLE "saved_visualizations" ADD CONSTRAINT "saved_visualizations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_visualizations" ADD CONSTRAINT "saved_visualizations_dataset_id_fkey"
    FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_dataset_id_fkey"
    FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
