-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "idx_users_multi" ON "users"("a", "b", "c");
