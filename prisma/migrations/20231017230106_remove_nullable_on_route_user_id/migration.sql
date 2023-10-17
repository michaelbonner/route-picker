/*
 Warnings:
 
 - Made the column `userId` on table `Route` required. This step will fail if there are existing NULL values in that column.
 
 */
-- DropForeignKey
ALTER TABLE "Route" DROP CONSTRAINT "Route_userId_fkey";
-- 
-- AlterTable
ALTER TABLE "Route"
ALTER COLUMN "userId"
SET NOT NULL;
-- 
-- AddForeignKey
ALTER TABLE "Route"
ADD CONSTRAINT "Route_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;