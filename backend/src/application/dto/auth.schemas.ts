import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов"),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
