/*
  Warnings:

  - You are about to drop the column `supabase_user_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "users_supabase_user_id_idx";

-- DropIndex
DROP INDEX "users_supabase_user_id_key";

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "settings" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "supabase_user_id",
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");
