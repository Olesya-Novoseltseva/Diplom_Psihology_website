-- CreateTable
CREATE TABLE "survey_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "survey_key" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "survey_attempts_user_id_survey_key_created_at_idx" ON "survey_attempts"("user_id", "survey_key", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "survey_attempts" ADD CONSTRAINT "survey_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
