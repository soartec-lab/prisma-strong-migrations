-- AlterTable
-- prisma-strong-migrations-disable-next-line addVolatileDefault
ALTER TABLE "posts" ADD COLUMN "score" FLOAT DEFAULT random();
