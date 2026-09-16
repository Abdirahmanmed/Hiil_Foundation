import { describe, expect, it } from "vitest";
import { resolveStorageKey, UPLOAD_ROOT } from "../src/utils/upload.js";
import { buildStorageKey, parseStorageKey } from "../src/config/cloudinary.js";

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

/**
 * Les deux stockages doivent rester distinguables sans ambiguite : le jour ou
 * une cle Cloudinary serait prise pour une cle locale, resolveStorageKey la
 * chercherait sur le disque et repondrait « document disparu » a propos d'un
 * fichier parfaitement intact.
 */
describe("clés Cloudinary", () => {
  const cle = buildStorageKey({
    resourceType: "raw",
    publicId: "hiil/kyc/id_docs/1758_ab12cd34.pdf",
  });

  it("fait l'aller-retour sans rien perdre", () => {
    expect(parseStorageKey(cle)).toEqual({
      resourceType: "raw",
      publicId: "hiil/kyc/id_docs/1758_ab12cd34.pdf",
    });
  });

  it("garde le public_id intact, slashs compris", () => {
    expect(cle.endsWith("hiil/kyc/id_docs/1758_ab12cd34.pdf")).toBe(true);
  });

  it.each([
    ["private_uploads/id_docs/abc.png"],
    ["/var/data/private_uploads/abc.png"],
    ["cloudinary"],
    ["cloudinary|raw"],
    ["cloudinary|raw|"],
    [""],
    [null],
    [undefined],
  ])("ne revendique pas la clé locale %s", (valeur) => {
    expect(parseStorageKey(valeur)).toBeNull();
  });
});
