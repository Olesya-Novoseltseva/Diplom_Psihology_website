import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://wellness:wellness@localhost:5432/wellness_dev?schema=public",
      JWT_SECRET: "01234567890123456789012345678901",
      CORS_ORIGIN: "http://localhost:5173",
    },
  },
});
