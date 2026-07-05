-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'KBZ_PAY', 'AYA_PAY', 'ONLINE_PAYMENT');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
ALTER COLUMN "currency" SET DEFAULT 'MMK';
