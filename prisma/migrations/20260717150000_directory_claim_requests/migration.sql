ALTER TABLE "DirectoryListing"
ADD COLUMN "claimRequestedByUserId" TEXT,
ADD COLUMN "claimRequestedAt" TIMESTAMP(3);

CREATE INDEX "DirectoryListing_claimStatus_claimRequestedAt_idx"
ON "DirectoryListing"("claimStatus", "claimRequestedAt");

CREATE INDEX "DirectoryListing_claimRequestedByUserId_idx"
ON "DirectoryListing"("claimRequestedByUserId");

ALTER TABLE "DirectoryListing"
ADD CONSTRAINT "DirectoryListing_claimRequestedByUserId_fkey"
FOREIGN KEY ("claimRequestedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
