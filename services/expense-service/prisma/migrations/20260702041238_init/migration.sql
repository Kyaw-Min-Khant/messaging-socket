-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FOOD', 'TRANSPORT', 'HOUSING', 'UTILITIES', 'HEALTHCARE', 'ENTERTAINMENT', 'SHOPPING', 'EDUCATION', 'TRAVEL', 'SAVINGS', 'OTHER');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "description" VARCHAR(500),
    "spent_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_user_id_spent_at_idx" ON "expenses"("user_id", "spent_at");

-- CreateIndex
CREATE INDEX "expenses_user_id_category_idx" ON "expenses"("user_id", "category");
