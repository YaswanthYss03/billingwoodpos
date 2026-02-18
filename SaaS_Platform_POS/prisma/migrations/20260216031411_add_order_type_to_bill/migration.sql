-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY');

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "order_type" "OrderType";
