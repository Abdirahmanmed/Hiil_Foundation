import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // Les tests qui touchent la base doivent etre serialises : ils partagent
    // les memes tables.
    fileParallelism: false,
    globalSetup: ["./tests/setup/guard.js"],
  },
});
