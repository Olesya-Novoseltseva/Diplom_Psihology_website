import type { CampusMarkerCategory } from "@prisma/client";

export type BuildingPublic = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  addressNote: string | null;
  lat: number | null;
  lng: number | null;
  sortOrder: number;
  /** Заполняется в списке зданий */
  floorCount?: number;
};

export type BuildingFloorPublic = {
  id: string;
  buildingId: string;
  levelIndex: number;
  label: string | null;
  planImageUrl: string | null;
  sortOrder: number;
};

export type CampusMarkerPublic = {
  id: string;
  buildingId: string | null;
  category: CampusMarkerCategory;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  sortOrder: number;
};
