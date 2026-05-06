import type { CampusMarkerCategory } from "@prisma/client";
import type { BuildingPublic, BuildingFloorPublic, CampusMarkerPublic } from "../entities/campus.types.js";

export type MarkerFilter = {
  buildingId?: string;
  category?: CampusMarkerCategory;
};

export type BuildingBundle = {
  building: BuildingPublic;
  floors: BuildingFloorPublic[];
};

export interface ICampusCatalogRepository {
  listBuildings(): Promise<BuildingPublic[]>;
  findBuildingBundleBySlug(slug: string): Promise<BuildingBundle | null>;
  listMarkers(filter: MarkerFilter): Promise<CampusMarkerPublic[]>;
}
