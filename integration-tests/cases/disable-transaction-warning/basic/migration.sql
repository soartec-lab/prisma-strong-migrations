-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
