-- AlterTable: add aspectRatio column with default value
ALTER TABLE "demo_projects" ADD COLUMN IF NOT EXISTS "aspectRatio" TEXT NOT NULL DEFAULT '16:9';
