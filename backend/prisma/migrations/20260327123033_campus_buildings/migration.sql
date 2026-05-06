-- CreateEnum
CREATE TYPE "CampusMarkerCategory" AS ENUM ('QUIET', 'FOOD', 'STUDY', 'RELAX', 'SERVICE', 'OTHER');

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_floors" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "level_index" INTEGER NOT NULL,
    "label" TEXT,
    "plan_image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "building_floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_markers" (
    "id" TEXT NOT NULL,
    "building_id" TEXT,
    "category" "CampusMarkerCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_markers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buildings_slug_key" ON "buildings"("slug");

-- CreateIndex
CREATE INDEX "building_floors_building_id_idx" ON "building_floors"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "building_floors_building_id_level_index_key" ON "building_floors"("building_id", "level_index");

-- CreateIndex
CREATE INDEX "campus_markers_building_id_idx" ON "campus_markers"("building_id");

-- CreateIndex
CREATE INDEX "campus_markers_category_idx" ON "campus_markers"("category");

-- AddForeignKey
ALTER TABLE "building_floors" ADD CONSTRAINT "building_floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_markers" ADD CONSTRAINT "campus_markers_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
