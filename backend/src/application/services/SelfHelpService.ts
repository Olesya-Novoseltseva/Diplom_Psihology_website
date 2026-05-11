import type { PrismaClient } from "@prisma/client";
import { HELP_TOPICS } from "../../data/selfhelpSeed.js";

export class SelfHelpService {
  constructor(private readonly prisma: PrismaClient) {}

  async list() {
    const rows = await this.prisma.selfHelpTopic.findMany({
      where: { isActive: true },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    if (rows.length === 0) {
      return HELP_TOPICS.map(({ slug, title, summary }) => ({ slug, title, summary }));
    }
    return rows.map(({ slug, title, summary }) => ({ slug, title, summary }));
  }

  async bySlug(slug: string) {
    const row = await this.prisma.selfHelpTopic.findFirst({
      where: { slug, isActive: true },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });
    if (!row) return HELP_TOPICS.find((t) => t.slug === slug) ?? null;
    return {
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      disclaimer: row.disclaimer,
      sections: row.sections.map((s) => ({
        heading: s.heading,
        paragraphs: Array.isArray(s.paragraphs) ? (s.paragraphs as string[]) : [],
        bullets: Array.isArray(s.bullets) ? (s.bullets as string[]) : undefined,
      })),
    };
  }
}
