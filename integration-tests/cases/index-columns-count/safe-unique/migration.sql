-- prisma-migrate-disable-next-transaction
CREATE UNIQUE INDEX CONCURRENTLY "idx_users_unique" ON "users"("a", "b", "c", "d");
