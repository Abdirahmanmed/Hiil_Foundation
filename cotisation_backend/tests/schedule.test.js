import { describe, expect, it } from "vitest";
import {
  addPeriods,
  idempotencyKeyFor,
  overdueDays,
  periodStartFor,
} from "../src/utils/schedule.js";

const d = (iso) => new Date(`${iso}T00:00:00Z`);
const iso = (date) => date.toISOString().slice(0, 10);

describe("addPeriods : le piège du dernier jour du mois", () => {
  // setMonth deborde : 31 janvier + 1 mois donnerait le 3 mars si on ne
  // ramenait pas le jour au dernier du mois d'arrivee.
  const cas = [
    ["2026-01-31", "MONTHLY", "2026-02-28"],
    ["2028-01-31", "MONTHLY", "2028-02-29"],
    ["2026-03-31", "MONTHLY", "2026-04-30"],
    ["2026-01-15", "MONTHLY", "2026-02-15"],
    ["2026-11-30", "QUARTERLY", "2027-02-28"],
    ["2026-08-31", "SEMIANNUAL", "2027-02-28"],
    ["2028-02-29", "ANNUAL", "2029-02-28"],
    ["2026-12-31", "MONTHLY", "2027-01-31"],
  ];

  it.each(cas)("%s + %s = %s", (depart, freq, attendu) => {
    expect(iso(addPeriods(d(depart), freq))).toBe(attendu);
  });

  it("refuse une fréquence inconnue plutôt que de produire une date fausse", () => {
    expect(() => addPeriods(d("2026-01-01"), "HEBDOMADAIRE")).toThrowError();
  });
});

describe("retard", () => {
  it("vaut 0 pour une échéance future", () => {
    expect(overdueDays(new Date(Date.now() + 86_400_000))).toBe(0);
  });

  it("compte les jours écoulés", () => {
    expect(overdueDays(new Date(Date.now() - 3 * 86_400_000))).toBe(3);
  });

  it("vaut 0 quand aucune échéance n'est fixée", () => {
    expect(overdueDays(null)).toBe(0);
  });
});

describe("clé d'idempotence", () => {
  // L'ancien venderRef contenait Date.now() : deux clics = deux paiements.
  it("est stable sur toute la journée", () => {
    const matin = idempotencyKeyFor("abc", new Date("2026-09-14T06:00:00Z"));
    const soir = idempotencyKeyFor("abc", new Date("2026-09-14T23:59:00Z"));
    expect(matin).toBe(soir);
  });

  it("change d'une échéance à l'autre", () => {
    expect(idempotencyKeyFor("abc", d("2026-09-14"))).not.toBe(
      idempotencyKeyFor("abc", d("2026-10-14")),
    );
  });

  it("change d'une cotisation à l'autre", () => {
    expect(idempotencyKeyFor("abc", d("2026-09-14"))).not.toBe(
      idempotencyKeyFor("xyz", d("2026-09-14")),
    );
  });

  it("normalise la période au jour", () => {
    expect(iso(periodStartFor(new Date("2026-09-14T18:22:33Z")))).toBe("2026-09-14");
  });
});
