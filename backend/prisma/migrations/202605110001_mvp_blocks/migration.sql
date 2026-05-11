CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

ALTER TABLE "survey_attempts"
  ADD COLUMN "survey_id" TEXT,
  ADD COLUMN "survey_version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "surveys" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "shared_option_labels" JSONB,
  "score_bands" JSONB NOT NULL DEFAULT '[]',
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "survey_questions" (
  "id" TEXT NOT NULL,
  "survey_id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "min" INTEGER NOT NULL DEFAULT 0,
  "max" INTEGER NOT NULL DEFAULT 3,
  "reverse_score" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "selfhelp_topics" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "disclaimer" TEXT NOT NULL,
  "categories" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "selfhelp_topics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "selfhelp_sections" (
  "id" TEXT NOT NULL,
  "topic_id" TEXT NOT NULL,
  "heading" TEXT NOT NULL,
  "paragraphs" JSONB NOT NULL,
  "bullets" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "selfhelp_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_contacts" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "phone" TEXT,
  "url" TEXT,
  "email" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campus_map_images" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campus_map_images_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "campus_markers"
  ADD COLUMN "x" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "y" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "floor_label" TEXT,
  ADD COLUMN "room_label" TEXT,
  ADD COLUMN "image_url" TEXT,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "updated_by_id" TEXT;

CREATE UNIQUE INDEX "surveys_key_key" ON "surveys"("key");
CREATE UNIQUE INDEX "selfhelp_topics_slug_key" ON "selfhelp_topics"("slug");
CREATE INDEX "survey_attempts_survey_id_idx" ON "survey_attempts"("survey_id");
CREATE INDEX "survey_questions_survey_id_idx" ON "survey_questions"("survey_id");
CREATE INDEX "selfhelp_sections_topic_id_idx" ON "selfhelp_sections"("topic_id");
CREATE INDEX "campus_markers_is_active_idx" ON "campus_markers"("is_active");

ALTER TABLE "survey_attempts" ADD CONSTRAINT "survey_attempts_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "selfhelp_sections" ADD CONSTRAINT "selfhelp_sections_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "selfhelp_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campus_markers" ADD CONSTRAINT "campus_markers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "campus_markers" ADD CONSTRAINT "campus_markers_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
