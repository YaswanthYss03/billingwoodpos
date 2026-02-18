/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,bill_number]` on the table `bills` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "bills_bill_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "bills_tenant_id_bill_number_key" ON "bills"("tenant_id", "bill_number");
