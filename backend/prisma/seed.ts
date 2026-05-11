import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PHQ9_SURVEY } from "../src/application/surveys/phq9Survey.js";
import { GAD7_SURVEY } from "../src/application/surveys/gad7Survey.js";
import { PSS10_SURVEY } from "../src/application/surveys/pss10Survey.js";
import { HELP_TOPICS } from "../src/data/selfhelpSeed.js";

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

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin12345";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });

  for (const [index, survey] of [PHQ9_SURVEY, GAD7_SURVEY, PSS10_SURVEY].entries()) {
    await prisma.survey.upsert({
      where: { key: survey.key },
      update: {
        title: survey.title,
        description: survey.description,
        sharedOptionLabels: survey.sharedOptionLabels ?? undefined,
        isActive: true,
        sortOrder: index,
        questions: {
          deleteMany: {},
          create: survey.questions.map((q, i) => ({ text: q.text, min: q.min, max: q.max, sortOrder: i })),
        },
      },
      create: {
        key: survey.key,
        title: survey.title,
        description: survey.description,
        sharedOptionLabels: survey.sharedOptionLabels ?? undefined,
        scoreBands: [],
        sortOrder: index,
        questions: {
          create: survey.questions.map((q, i) => ({ text: q.text, min: q.min, max: q.max, sortOrder: i })),
        },
      },
    });
  }

  for (const [index, topic] of HELP_TOPICS.entries()) {
    await prisma.selfHelpTopic.upsert({
      where: { slug: topic.slug },
      update: {
        title: topic.title,
        summary: topic.summary,
        disclaimer: topic.disclaimer,
        categories: topic.categories,
        isActive: true,
        sortOrder: index,
        sections: {
          deleteMany: {},
          create: topic.sections.map((s, i) => ({ ...s, sortOrder: i })),
        },
      },
      create: {
        slug: topic.slug,
        title: topic.title,
        summary: topic.summary,
        disclaimer: topic.disclaimer,
        categories: topic.categories,
        sortOrder: index,
        sections: {
          create: topic.sections.map((s, i) => ({ ...s, sortOrder: i })),
        },
      },
    });
  }

  await prisma.supportContact.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      title: "Контакты поддержки будут добавлены",
      description: "Заказчик укажет контакты позднее; пока система показывает безопасную общую рекомендацию.",
      sortOrder: 1,
    },
  });

  const firstBuilding = await prisma.building.findFirst({ orderBy: { sortOrder: "asc" } });
  const demoMarkers = [
    { title: "Тихая зона", category: "QUIET" as const, x: 55, y: 68, floorLabel: "1 этаж", roomLabel: "зона отдыха" },
    { title: "Столовая", category: "FOOD" as const, x: 22, y: 23, floorLabel: "1 этаж", roomLabel: "рядом с входом" },
    { title: "Учебное пространство", category: "STUDY" as const, x: 82, y: 38, floorLabel: "2 этаж", roomLabel: "аудитория" },
  ];
  await prisma.campusMarker.deleteMany({
    where: { title: { in: demoMarkers.map((m) => m.title) }, createdById: admin.id },
  });
  for (const [i, marker] of demoMarkers.entries()) {
    await prisma.campusMarker.create({
      data: {
        ...marker,
        buildingId: firstBuilding?.id,
        description: "Демо-точка для статичной карты кампуса. Администратор может заменить описание и координаты.",
        lat: BASE_LAT,
        lng: BASE_LNG,
        sortOrder: i,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  console.log(`Seed complete: buildings=${LETI_BUILDINGS.length}, admin=${adminEmail}, surveys/selfhelp/demo markers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
