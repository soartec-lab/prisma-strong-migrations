ALTER TABLE "users" ADD COLUMN "token" uuid DEFAULT gen_random_uuid();
