import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Корпуса ЛЭТИ: slug и число этажей по вашему списку. Координаты — ориентировочно вокруг кампуса; уточните при необходимости. */
const LETI_BUILDINGS: Array<{ slug: string; name: string; floorCount: number; sortOrder: number }> = [
  { slug: "korpus-1", name: "Корпус 1", floorCount: 3, sortOrder: 1 },
  { slug: "korpus-2", name: "Корпус 2", floorCount: 4, sortOrder: 2 },
  { slug: "korpus-3", name: "Корпус 3", floorCount: 4, sortOrder: 3 },
  { slug: "korpus-4", name: "Корпус 4", floorCount: 4, sortOrder: 4 },
  { slug: "korpus-5-auditorniy", name: "Корпус 5 (аудиторный)", floorCount: 5, sortOrder: 5 },
  { slug: "korpus-5-laboratorniy", name: "Корпус 5 (лабораторный)", floorCount: 6, sortOrder: 6 },
  { slug: "korpus-6", name: "Корпус 6", floorCount: 4, sortOrder: 7 },
  { slug: "korpus-7", name: "Корпус 7", floorCount: 3, sortOrder: 8 },
  { slug: "korpus-8", name: "Корпус 8", floorCount: 2, sortOrder: 9 },
  { slug: "korpus-d", name: "Корпус Д", floorCount: 4, sortOrder: 10 },
  { slug: "korpus-c", name: "Корпус С", floorCount: 4, sortOrder: 11 },
  { slug: "korpus-p", name: "Корпус П", floorCount: 1, sortOrder: 12 },
  { slug: "technopark", name: "Технопарк", floorCount: 1, sortOrder: 13 },
];

const BASE_LAT = 59.8774;
const BASE_LNG = 30.2193;

function coordsForIndex(i: number, total: number): { lat: number; lng: number } {
  const angle = (i / total) * 2 * Math.PI;
  const r = 0.00032;
  return { lat: BASE_LAT + r * Math.cos(angle), lng: BASE_LNG + r * Math.sin(angle) };
}

async function main() {
  const desc =
    "Корпус СПбГЭТУ «ЛЭТИ» для навигационного модуля. Схемы этажей и точки интереса можно добавить позже.";

  for (let i = 0; i < LETI_BUILDINGS.length; i++) {
    const b = LETI_BUILDINGS[i]!;
    const { lat, lng } = coordsForIndex(i, LETI_BUILDINGS.length);

    const building = await prisma.building.upsert({
      where: { slug: b.slug },
      create: {
        slug: b.slug,
        name: b.name,
        description: desc,
        addressNote: null,
        lat,
        lng,
        sortOrder: b.sortOrder,
      },
      update: {
        name: b.name,
        description: desc,
        lat,
        lng,
        sortOrder: b.sortOrder,
      },
    });

    await prisma.buildingFloor.deleteMany({ where: { buildingId: building.id } });

    await prisma.buildingFloor.createMany({
      data: Array.from({ length: b.floorCount }, (_, level) => ({
        buildingId: building.id,
        levelIndex: level,
        label: `${level + 1} этаж`,
        sortOrder: level,
        planImageUrl: null,
      })),
    });
  }

  console.log(`Upserted ${LETI_BUILDINGS.length} LETI buildings and floors.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
