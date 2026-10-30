-- Align Meeting / Client with ACL v1 (organizer) and client-link policy.
-- CreateEnum
CREATE TYPE "ClientLinkStatus" AS ENUM ('internal', 'matched', 'unmatched');

-- AlterTable Client: email domain for matching (backfill existing rows if any)
ALTER TABLE "Client" ADD COLUMN "emailDomain" TEXT;

UPDATE "Client"
SET "emailDomain" = 'unknown.' || REPLACE("id"::text, '-', '')
WHERE "emailDomain" IS NULL;

ALTER TABLE "Client" ALTER COLUMN "emailDomain" SET NOT NULL;

CREATE UNIQUE INDEX "Client_emailDomain_key" ON "Client"("emailDomain");

-- AlterTable Meeting: organizer, link status, confidential, duration, external participants
ALTER TABLE "Meeting" ADD COLUMN "organizerId" UUID;
ALTER TABLE "Meeting" ADD COLUMN "clientLinkStatus" "ClientLinkStatus" NOT NULL DEFAULT 'internal';
ALTER TABLE "Meeting" ADD COLUMN "confidential" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Meeting" ADD COLUMN "durationSeconds" INTEGER;
ALTER TABLE "Meeting" ADD COLUMN "externalParticipants" JSONB;

-- CreateIndex
CREATE INDEX "Meeting_organizerId_idx" ON "Meeting"("organizerId");

-- CreateIndex
CREATE INDEX "Meeting_clientLinkStatus_idx" ON "Meeting"("clientLinkStatus");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
