import { z } from "zod";

export const createJournalBodySchema = z.object({
  content: z.string().trim().min(1, "Текст не может быть пустым").max(16_000),
});

export type CreateJournalBody = z.infer<typeof createJournalBodySchema>;

export const listJournalQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type ListJournalQuery = z.infer<typeof listJournalQuerySchema>;
