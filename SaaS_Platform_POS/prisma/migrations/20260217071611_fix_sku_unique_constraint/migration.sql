/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,sku]` on the table `items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "items_sku_key";

-- CreateIndex
CREATE UNIQUE INDEX "items_tenant_id_sku_key" ON "items"("tenant_id", "sku");
