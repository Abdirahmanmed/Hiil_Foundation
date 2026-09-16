import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ce garde-fou bloque le demarrage, donc il se teste avant d'etre decouvert en
 * production. Le scenario qu'il empeche : STORAGE_MODE=cloudinary avec une
 * variable mal collee, retombee silencieuse sur le disque, et les pieces
 * d'identite perdues au redeploiement suivant — des mois plus tard, sans
 * qu'aucune erreur n'ait jamais ete levee.
 */

const BASE = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  JWT_ACCESS_SECRET: "a".repeat(48),
  JWT_REFRESH_SECRET: "b".repeat(48),
  OTP_PEPPER: "c".repeat(32),
  CAC_PAYMENT_MODE: "mock",
  BREVO_API_KEY: "cle",
  EMAIL_FROM: "no-reply@exemple.org",
};

const IDENTIFIANTS = {
  CLOUDINARY_CLOUD_NAME: "demo",
  CLOUDINARY_API_KEY: "123456789012345",
  CLOUDINARY_API_SECRET: "abcdefghijklmnopqrstuvwxyz0",
};

const A_EFFACER = [
  "STORAGE_MODE",
  "CLOUDINARY_URL",
  ...Object.keys(IDENTIFIANTS),
  ...Object.keys(BASE),
  "NODE_ENV",
];

let sauvegarde;

beforeEach(() => {
  sauvegarde = { ...process.env };
  for (const cle of A_EFFACER) delete process.env[cle];

  // env.js importe dotenv/config, qui lirait le .env du développeur et
  // repeuplerait les variables qu'on vient d'effacer : le résultat du test
  // dépendrait alors de la machine. On pointe dotenv vers un fichier absent,
  // ce qu'il ignore silencieusement.
  process.env.DOTENV_CONFIG_PATH = ".env.absent-pour-les-tests";

  vi.resetModules();
});

afterEach(() => {
  process.env = sauvegarde;
});

/** env.js lit process.env au chargement : chaque cas exige un module neuf. */
async function chargerEnv(vars) {
  Object.assign(process.env, BASE, vars);
  vi.resetModules();
  const { env } = await import("../src/config/env.js");
  return env;
}

describe("STORAGE_MODE", () => {
  it("cloudinary avec les trois variables séparées", async () => {
    const env = await chargerEnv({
      NODE_ENV: "production",
      STORAGE_MODE: "cloudinary",
      ...IDENTIFIANTS,
    });
    expect(env.DOCUMENT_STORAGE).toBe("cloudinary");
  });

  it("cloudinary avec CLOUDINARY_URL seule", async () => {
    const env = await chargerEnv({
      NODE_ENV: "production",
      STORAGE_MODE: "cloudinary",
      CLOUDINARY_URL: "cloudinary://123456789012345:abcdefghijklmnopq@demo",
    });
    expect(env.DOCUMENT_STORAGE).toBe("cloudinary");
  });

  it("cloudinary sans identifiants échoue au lieu de retomber sur le disque", async () => {
    await expect(
      chargerEnv({ NODE_ENV: "production", STORAGE_MODE: "cloudinary" }),
    ).rejects.toThrow(/aucun identifiant/i);
  });

  it("local est refusé en production", async () => {
    await expect(
      chargerEnv({ NODE_ENV: "production", STORAGE_MODE: "local" }),
    ).rejects.toThrow(/interdit en production/i);
  });

  it("local est accepté en développement", async () => {
    const env = await chargerEnv({ NODE_ENV: "development", STORAGE_MODE: "local" });
    expect(env.DOCUMENT_STORAGE).toBe("local");
  });

  it("une valeur inconnue est refusée", async () => {
    await expect(
      chargerEnv({ NODE_ENV: "development", STORAGE_MODE: "s3" }),
    ).rejects.toThrow(/cloudinary ou local/i);
  });

  it("sans STORAGE_MODE, la production sans identifiants refuse de démarrer", async () => {
    await expect(chargerEnv({ NODE_ENV: "production" })).rejects.toThrow(
      /non configuré/i,
    );
  });

  it("sans STORAGE_MODE, des identifiants présents suffisent", async () => {
    const env = await chargerEnv({ NODE_ENV: "production", ...IDENTIFIANTS });
    expect(env.DOCUMENT_STORAGE).toBe("cloudinary");
  });

  it("sans STORAGE_MODE ni identifiants, le développement reste local", async () => {
    const env = await chargerEnv({ NODE_ENV: "development" });
    expect(env.DOCUMENT_STORAGE).toBe("local");
  });
});
