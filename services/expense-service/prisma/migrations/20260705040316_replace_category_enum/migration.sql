/*
  Warnings:

  - You are about to drop the column `category` on the `expenses` table. All the data in the column will be lost.
  - Added the required column `category_id` to the `expenses` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "expenses_user_id_category_idx";

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "category",
ADD COLUMN     "category_id" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ExpenseCategory";

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE INDEX "expenses_user_id_category_id_idx" ON "expenses"("user_id", "category_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
