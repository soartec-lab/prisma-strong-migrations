-- prisma-migrate-disable-next-transaction
-- AddUniqueConstraint
CREATE UNIQUE INDEX CONCURRENTLY "posts_title_key_idx" ON "posts"("title");
ALTER TABLE "posts" ADD CONSTRAINT "posts_title_key" UNIQUE USING INDEX "posts_title_key_idx";
