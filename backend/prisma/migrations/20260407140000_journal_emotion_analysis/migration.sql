-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "primary_emotion" TEXT NOT NULL DEFAULT 'neutral',
ADD COLUMN     "primary_intensity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "emotion_profile" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "problem_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "suggest_psychologist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "advice_from_model" TEXT;
