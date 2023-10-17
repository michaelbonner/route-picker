-- AlterTable
ALTER TABLE "Route"
ADD COLUMN "userId" INTEGER;
-- 
-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
-- 
-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
-- 
-- CreateIndex
CREATE UNIQUE INDEX "User_email_provider_key" ON "User"("email", "provider");
-- 
-- CreateIndex
CREATE INDEX "userId" ON "Route"("userId");
-- 
-- AddForeignKey
ALTER TABLE "Route"
ADD CONSTRAINT "Route_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE
SET NULL ON UPDATE CASCADE;