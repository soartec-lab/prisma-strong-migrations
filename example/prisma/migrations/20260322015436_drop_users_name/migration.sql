/*
  Warnings:

  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
-- prisma-strong-migrations-disable-next-line removeColumn
ALTER TABLE "users" DROP COLUMN "name";
