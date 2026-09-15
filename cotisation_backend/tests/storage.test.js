import { describe, expect, it } from "vitest";
import { resolveStorageKey, UPLOAD_ROOT } from "../src/utils/upload.js";

/**
 * Les cles de stockage viennent de la base, pas de l'URL — mais une piece
 * d'identite se lit derriere cette fonction, et une defense en profondeur ne
 * coute rien.
 */
describe("résolution des clés de stockage", () => {
  it("résout une clé légitime sous la racine", () => {
    const r = resolveStorageKey("private_uploads/id_docs/abc.png");
    expect(r.startsWith(UPLOAD_ROOT)).toBe(true);
    expect(r).toContain("abc.png");
  });

  it.each([
    ["../../../etc/passwd"],
    ["private_uploads/../../.env"],
    ["../.env"],
    ["private_uploads/../../../../../../etc/shadow"],
  ])("refuse la traversée %s", (cle) => {
    expect(() => resolveStorageKey(cle)).toThrowError();
  });

  it("refuse une clé vide", () => {
    // Une cle vide resout sur la racine elle-meme, qui n'est pas un fichier :
    // on ne veut pas non plus la laisser passer.
    expect(() => resolveStorageKey("")).toThrowError();
  });
});
