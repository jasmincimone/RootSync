-- AlterTable
ALTER TABLE "CommunityPost" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED';

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_status_idx" ON "CommunityPost"("authorId", "status");
