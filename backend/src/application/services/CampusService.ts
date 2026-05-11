import type { CampusMarkerCategory } from "@prisma/client";
import type { ICampusCatalogRepository, MarkerFilter } from "../../domain/repositories/ICampusCatalogRepository.js";
import { NotFoundError } from "../../domain/errors/HttpError.js";

export class CampusService {
  constructor(private readonly campus: ICampusCatalogRepository) {}

  buildings() {
    return this.campus.listBuildings();
  }

  async buildingBySlug(slug: string) {
    const bundle = await this.campus.findBuildingBundleBySlug(slug);
    if (!bundle) throw new NotFoundError("Здание не найдено");
    return bundle;
  }

  markers(filter: MarkerFilter) {
    return this.campus.listMarkers(filter);
  }

  planImage(): Promise<{ imageUrl: string } | null> {
    return this.campus.findDefaultCampusPlan();
  }

  static parseCategory(raw: unknown): CampusMarkerCategory | undefined {
    if (typeof raw !== "string") return undefined;
    const up = raw.toUpperCase() as CampusMarkerCategory;
    const allowed: CampusMarkerCategory[] = ["QUIET", "FOOD", "STUDY", "RELAX", "SERVICE", "OTHER"];
    return allowed.includes(up) ? up : undefined;
  }
}
