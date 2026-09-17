import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // Les tests qui touchent la base doivent etre serialises : ils partagent
    // les memes tables.
    fileParallelism: false,
    globalSetup: ["./tests/setup/guard.js"],
    // Pose les variables exigees par env.js au chargement. Sans lui, la suite
    // ne passe que sur un poste ayant un .env — donc jamais en CI.
    setupFiles: ["./tests/setup/env.js"],
  },
});
