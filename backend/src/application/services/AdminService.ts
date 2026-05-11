import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { CampusMarkerCategory, Prisma, PrismaClient } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../../domain/errors/HttpError.js";

export type MarkerInput = {
  buildingId?: string | null;
  category: CampusMarkerCategory;
  title: string;
  description?: string | null;
  lat?: number;
  lng?: number;
  x: number;
  y: number;
  floorLabel?: string | null;
  roomLabel?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type SurveyInput = {
  key: string;
  title: string;
  description: string;
  sharedOptionLabels?: string[];
  scoreBands?: unknown[];
  questions: Array<{ text: string; min: number; max: number; reverseScore?: boolean }>;
  isActive?: boolean;
  sortOrder?: number;
};

export type SelfHelpInput = {
  slug: string;
  title: string;
  summary: string;
  disclaimer: string;
  categories?: string[];
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
  isActive?: boolean;
  sortOrder?: number;
};

export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  listMarkers() {
    return this.prisma.campusMarker.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
  }

  createMarker(adminId: string, input: MarkerInput) {
    return this.prisma.campusMarker.create({
      data: { ...input, lat: input.lat ?? 59.8774, lng: input.lng ?? 30.2193, createdById: adminId, updatedById: adminId },
    });
  }

  updateMarker(adminId: string, id: string, input: Partial<MarkerInput>) {
    return this.prisma.campusMarker.update({ where: { id }, data: { ...input, updatedById: adminId } });
  }

  async deleteMarker(adminId: string, id: string) {
    return this.updateMarker(adminId, id, { isActive: false });
  }

  async setDefaultCampusPlan(imageUrl: string, title = "План кампуса") {
    await this.prisma.campusMapImage.updateMany({ data: { isDefault: false } });
    return this.prisma.campusMapImage.create({
      data: { title: title.trim() || "План кампуса", imageUrl, isDefault: true },
    });
  }

  listSurveys() {
    return this.prisma.survey.findMany({
      include: { questions: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
  }

  async createSurvey(input: SurveyInput) {
    return this.prisma.survey.create({
      data: {
        key: input.key,
        title: input.title,
        description: input.description,
        sharedOptionLabels: input.sharedOptionLabels ?? undefined,
        scoreBands: (input.scoreBands ?? []) as Prisma.InputJsonValue,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        questions: { create: input.questions.map((q, i) => ({ ...q, reverseScore: q.reverseScore ?? false, sortOrder: i })) },
      },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async updateSurvey(id: string, input: Partial<SurveyInput>) {
    const existing = await this.prisma.survey.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Опросник не найден");
    return this.prisma.$transaction(async (tx) => {
      if (input.questions) {
        await tx.surveyQuestion.deleteMany({ where: { surveyId: id } });
      }
      return tx.survey.update({
        where: { id },
        data: {
          key: input.key,
          title: input.title,
          description: input.description,
          sharedOptionLabels: input.sharedOptionLabels ?? undefined,
          scoreBands: input.scoreBands as Prisma.InputJsonValue | undefined,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          version: input.questions ? { increment: 1 } : undefined,
          questions: input.questions
            ? { create: input.questions.map((q, i) => ({ ...q, reverseScore: q.reverseScore ?? false, sortOrder: i })) }
            : undefined,
        },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      });
    });
  }

  deleteSurvey(id: string) {
    return this.prisma.survey.update({ where: { id }, data: { isActive: false } });
  }

  listSelfHelpTopics() {
    return this.prisma.selfHelpTopic.findMany({
      include: { sections: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
  }

  createSelfHelpTopic(input: SelfHelpInput) {
    return this.prisma.selfHelpTopic.create({
      data: {
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        disclaimer: input.disclaimer,
        categories: input.categories ?? [],
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        sections: { create: input.sections.map((s, i) => ({ ...s, sortOrder: i })) },
      },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async updateSelfHelpTopic(id: string, input: Partial<SelfHelpInput>) {
    return this.prisma.$transaction(async (tx) => {
      if (input.sections) await tx.selfHelpSection.deleteMany({ where: { topicId: id } });
      return tx.selfHelpTopic.update({
        where: { id },
        data: {
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          disclaimer: input.disclaimer,
          categories: input.categories ?? undefined,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          sections: input.sections ? { create: input.sections.map((s, i) => ({ ...s, sortOrder: i })) } : undefined,
        },
        include: { sections: { orderBy: { sortOrder: "asc" } } },
      });
    });
  }

  deleteSelfHelpTopic(id: string) {
    return this.prisma.selfHelpTopic.update({ where: { id }, data: { isActive: false } });
  }

  async saveDataUrlUpload(kind: "campus" | "selfhelp" | "map", filename: string, dataUrl: string) {
    const match = /^data:([a-z0-9/+.-]+);base64,(.+)$/i.exec(dataUrl);
    if (!match) throw new BadRequestError("Ожидается dataUrl в формате base64");
    const ext = extname(filename) || extensionFromMime(match[1] ?? "");
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9_.-]/g, "_")}${ext && filename.endsWith(ext) ? "" : ext}`;
    const dir = join(process.cwd(), "uploads", kind);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, safeName), Buffer.from(match[2] ?? "", "base64"));
    return { url: `/uploads/${kind}/${safeName}` };
  }
}

function extensionFromMime(mime: string): string {
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  return ".bin";
}
