-- CreateEnum
CREATE TYPE "InventoryMode" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "inventory_mode" "InventoryMode" NOT NULL DEFAULT 'AUTO';
