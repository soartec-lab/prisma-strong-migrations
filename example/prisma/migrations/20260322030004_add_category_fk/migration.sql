-- prisma-strong-migrations-disable-next-line intPrimaryKey
-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- prisma-strong-migrations-disable-next-line addIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- AlterTable
ALTER TABLE "posts" ADD COLUMN "category_id" INTEGER;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
-- prisma-strong-migrations-disable-next-line notValidValidateSameFile
ALTER TABLE "posts" VALIDATE CONSTRAINT "posts_category_id_fkey";
