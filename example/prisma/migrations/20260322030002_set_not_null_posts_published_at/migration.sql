-- AlterTable
ALTER TABLE "posts" ADD CONSTRAINT "posts_published_at_not_null" CHECK ("published_at" IS NOT NULL) NOT VALID;
ALTER TABLE "posts" VALIDATE CONSTRAINT "posts_published_at_not_null";
ALTER TABLE "posts" ALTER COLUMN "published_at" SET NOT NULL,
ALTER COLUMN "published_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "posts" DROP CONSTRAINT "posts_published_at_not_null";
