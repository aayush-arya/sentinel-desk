-- CreateEnum
CREATE TYPE "CommentSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "sentiment" "CommentSentiment";

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "aiSuggestedPriority" "TicketPriority",
ADD COLUMN     "aiSuggestedTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
