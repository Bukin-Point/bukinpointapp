-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('OPAY', 'PAYSTACK');

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "paymentGateway" "PaymentGateway";

-- CreateTable
CREATE TABLE "PaymentConfig" (
    "id" TEXT NOT NULL,
    "currentGateway" "PaymentGateway" NOT NULL DEFAULT 'OPAY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentConfig_pkey" PRIMARY KEY ("id")
);

-- Insert default global config (single row)
INSERT INTO "PaymentConfig" ("id", "currentGateway", "updatedAt")
SELECT 'clpaymentconfig0default', 'OPAY', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PaymentConfig" LIMIT 1);
