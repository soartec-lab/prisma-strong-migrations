/*
  Warnings:

  - You are about to alter the column `body` on the `posts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
-- prisma-strong-migrations-disable-next-line changeColumnType
ALTER TABLE "posts" ALTER COLUMN "body" SET DATA TYPE VARCHAR(255);
