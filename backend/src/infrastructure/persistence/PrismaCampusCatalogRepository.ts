import type { CampusMarkerCategory, PrismaClient } from "@prisma/client";
import type { ICampusCatalogRepository, MarkerFilter } from "../../domain/repositories/ICampusCatalogRepository.js";
import type { BuildingFloorPublic, BuildingPublic, CampusMarkerPublic } from "../../domain/entities/campus.types.js";

export class PrismaCampusCatalogRepository implements ICampusCatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listBuildings(): Promise<BuildingPublic[]> {
    const rows = await this.prisma.building.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { floors: true } } },
    });
    return rows.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      addressNote: b.addressNote,
      lat: b.lat,
      lng: b.lng,
      sortOrder: b.sortOrder,
      floorCount: b._count.floors,
    }));
  }

  async findBuildingBundleBySlug(slug: string) {
    const row = await this.prisma.building.findUnique({
      where: { slug },
      include: {
        floors: { orderBy: [{ sortOrder: "asc" }, { levelIndex: "asc" }] },
      },
    });
    if (!row) return null;

    const building: BuildingPublic = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      addressNote: row.addressNote,
      lat: row.lat,
      lng: row.lng,
      sortOrder: row.sortOrder,
    };

    const floors: BuildingFloorPublic[] = row.floors.map((f) => ({
      id: f.id,
      buildingId: f.buildingId,
      levelIndex: f.levelIndex,
      label: f.label,
      planImageUrl: f.planImageUrl,
      sortOrder: f.sortOrder,
    }));

    return { building, floors };
  }

  async listMarkers(filter: MarkerFilter): Promise<CampusMarkerPublic[]> {
    const where: {
      buildingId?: string;
      category?: CampusMarkerCategory;
      isActive: boolean;
    } = { isActive: true };
    if (filter.buildingId) where.buildingId = filter.buildingId;
    if (filter.category) where.category = filter.category;

    const rows = await this.prisma.campusMarker.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return rows.map((m) => ({
      id: m.id,
      buildingId: m.buildingId,
      category: m.category,
      title: m.title,
      description: m.description,
      lat: m.lat,
      lng: m.lng,
      x: m.x,
      y: m.y,
      floorLabel: m.floorLabel,
      roomLabel: m.roomLabel,
      imageUrl: m.imageUrl,
      isActive: m.isActive,
      sortOrder: m.sortOrder,
    }));
  }

  async findDefaultCampusPlan(): Promise<{ imageUrl: string } | null> {
    const preferred = await this.prisma.campusMapImage.findFirst({
      where: { isDefault: true },
      orderBy: [{ updatedAt: "desc" }],
    });
    if (preferred?.imageUrl) return { imageUrl: preferred.imageUrl };
    const any = await this.prisma.campusMapImage.findFirst({ orderBy: { updatedAt: "desc" } });
    return any?.imageUrl ? { imageUrl: any.imageUrl } : null;
  }
}
