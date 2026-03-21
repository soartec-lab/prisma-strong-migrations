-- prisma-strong-migrations-disable-next-line disableTransactionWarning
-- prisma-migrate-disable-next-transaction
-- CreateIndex
CREATE INDEX CONCURRENTLY "posts_user_id_idx" ON "posts"("user_id");
