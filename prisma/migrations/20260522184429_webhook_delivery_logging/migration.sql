/*
  Warnings:

  - You are about to drop the column `jobId` on the `WebhookDelivery` table. All the data in the column will be lost.
  - Added the required column `bullJobId` to the `WebhookDelivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event` to the `WebhookDelivery` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "WebhookDelivery" DROP CONSTRAINT "WebhookDelivery_jobId_fkey";

-- AlterTable
ALTER TABLE "WebhookDelivery" DROP COLUMN "jobId",
ADD COLUMN     "bullJobId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "event" TEXT NOT NULL,
ADD COLUMN     "latencyMs" INTEGER,
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "responseBody" TEXT;
