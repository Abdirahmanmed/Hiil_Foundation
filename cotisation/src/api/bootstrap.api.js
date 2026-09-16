import { http } from "./http";

// Le compte d'amorçage n'appelle que ces trois routes. Toutes les autres lui
// répondent 403 : il ne lit ni dépense, ni cotisation, ni membre.
const basePath = "/api/bootstrap";

export async function getOugasAdmins() {
  const res = await http.get(`${basePath}/ougas-admins`);
  return res.data; // { ougasAdmins }
}

export async function createOugasAdmin(payload) {
  const res = await http.post(`${basePath}/ougas-admins`, payload);
  return res.data; // { ougasAdmin }
}

// Chaque renvoi invalide le lien précédent.
export async function resendOugasInvite(userId) {
  const res = await http.post(
    `${basePath}/ougas-admins/${userId}/invite/resend`,
    {},
  );
  return res.data;
}
