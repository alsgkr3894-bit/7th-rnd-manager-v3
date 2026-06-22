-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StoreScope" AS ENUM ('BRAND', 'SHARED');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "db_name" TEXT,
    "color" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_catalog" (
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "scope" "StoreScope" NOT NULL DEFAULT 'BRAND',
    "key_path" TEXT,
    "auto_increment" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "indexes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_catalog_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "store_rows" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "scope" "StoreScope" NOT NULL DEFAULT 'BRAND',
    "record_key" TEXT NOT NULL,
    "legacy_numeric_id" INTEGER,
    "data" JSONB NOT NULL,
    "data_hash" TEXT,
    "source_backup_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_storage_entries" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT,
    "migrate_mode" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_storage_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_import_jobs" (
    "id" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "source_kind" TEXT,
    "source_brand_id" TEXT,
    "target_brand_id" TEXT,
    "backup_version" TEXT,
    "backup_exported_at" TIMESTAMP(3),
    "store_count" INTEGER NOT NULL DEFAULT 0,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "local_storage_count" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "data_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_import_errors" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "store_name" TEXT,
    "key" TEXT,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_code_key" ON "brands"("code");

-- CreateIndex
CREATE INDEX "store_catalog_module_idx" ON "store_catalog"("module");

-- CreateIndex
CREATE INDEX "store_catalog_scope_idx" ON "store_catalog"("scope");

-- CreateIndex
CREATE INDEX "store_rows_store_name_idx" ON "store_rows"("store_name");

-- CreateIndex
CREATE INDEX "store_rows_scope_store_name_idx" ON "store_rows"("scope", "store_name");

-- CreateIndex
CREATE INDEX "store_rows_brand_id_store_name_idx" ON "store_rows"("brand_id", "store_name");

-- CreateIndex
CREATE INDEX "store_rows_legacy_numeric_id_idx" ON "store_rows"("legacy_numeric_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_rows_brand_id_store_name_record_key_key" ON "store_rows"("brand_id", "store_name", "record_key");

-- CreateIndex
CREATE INDEX "local_storage_entries_key_idx" ON "local_storage_entries"("key");

-- CreateIndex
CREATE INDEX "local_storage_entries_category_idx" ON "local_storage_entries"("category");

-- CreateIndex
CREATE UNIQUE INDEX "local_storage_entries_brand_id_key_key" ON "local_storage_entries"("brand_id", "key");

-- CreateIndex
CREATE INDEX "data_import_jobs_status_idx" ON "data_import_jobs"("status");

-- CreateIndex
CREATE INDEX "data_import_jobs_target_brand_id_idx" ON "data_import_jobs"("target_brand_id");

-- CreateIndex
CREATE INDEX "data_import_jobs_started_at_idx" ON "data_import_jobs"("started_at");

-- CreateIndex
CREATE INDEX "data_import_errors_job_id_idx" ON "data_import_errors"("job_id");

-- CreateIndex
CREATE INDEX "data_import_errors_store_name_idx" ON "data_import_errors"("store_name");

-- CreateIndex
CREATE INDEX "server_settings_category_idx" ON "server_settings"("category");

-- AddForeignKey
ALTER TABLE "store_rows" ADD CONSTRAINT "store_rows_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_rows" ADD CONSTRAINT "store_rows_store_name_fkey" FOREIGN KEY ("store_name") REFERENCES "store_catalog"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_storage_entries" ADD CONSTRAINT "local_storage_entries_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_errors" ADD CONSTRAINT "data_import_errors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "data_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
