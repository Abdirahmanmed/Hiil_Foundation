import { http } from "./http";

/**
 * Candidatures de la vitrine publique : appel a projets et benevolat.
 * Route publique, aucun token n'est requis.
 */
export async function submitPublicFormApi(payload) {
  const res = await http.post("/api/public/submissions", payload);
  return res.data;
}
