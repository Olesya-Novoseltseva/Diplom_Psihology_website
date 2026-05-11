import type { ApiClient } from "./ApiClient.js";

export type CampusMarkerCategory = "QUIET" | "FOOD" | "STUDY" | "RELAX" | "SERVICE" | "OTHER";

export type BuildingListDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  addressNote: string | null;
  lat: number | null;
  lng: number | null;
  sortOrder: number;
  floorCount?: number;
};

export type FloorDto = {
  id: string;
  buildingId: string;
  levelIndex: number;
  label: string | null;
  planImageUrl: string | null;
  sortOrder: number;
};

export type MarkerDto = {
  id: string;
  buildingId: string | null;
  category: CampusMarkerCategory;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  x: number;
  y: number;
  floorLabel: string | null;
  roomLabel: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type MarkerQuery = {
  buildingId?: string;
  category?: CampusMarkerCategory;
};

function toQuery(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.trim()) usp.set(k, v);
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export class CampusApiService {
  constructor(private readonly http: ApiClient) {}

  listBuildings(): Promise<{ buildings: BuildingListDto[] }> {
    return this.http.getJson<{ buildings: BuildingListDto[] }>("/api/campus/buildings");
  }

  getBuilding(slug: string): Promise<{ building: BuildingListDto; floors: FloorDto[] }> {
    return this.http.getJson<{ building: BuildingListDto; floors: FloorDto[] }>(
      `/api/campus/buildings/${encodeURIComponent(slug)}`,
    );
  }

  listMarkers(q: MarkerQuery = {}): Promise<{ markers: MarkerDto[] }> {
    const query = toQuery({
      buildingId: q.buildingId,
      category: q.category,
    });
    return this.http.getJson<{ markers: MarkerDto[] }>(`/api/campus/markers${query}`);
  }

  /** URL картинки плана (если админ загрузил), иначе null — тогда placeholder */
  getPlanImage(): Promise<{ imageUrl: string | null }> {
    return this.http.getJson<{ imageUrl: string | null }>("/api/campus/plan-image");
  }
}
