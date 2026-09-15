import { http } from "./http";

export async function createSubscriptionApi(payload) {
  const res = await http.post("/api/subscriptions", payload);
  return res.data;
}

export async function listSubscriptionsApi() {
  const res = await http.get("/api/subscriptions");
  return res.data;
}

export async function consentApi(id, accepted = true) {
  const res = await http.post(`/api/subscriptions/${id}/consent`, { accepted });
  return res.data;
}

// Le membre corrige son engagement sans passer par le support.
export async function updateSubscriptionApi(id, payload) {
  const res = await http.patch(`/api/subscriptions/${id}`, payload);
  return res.data;
}

// Arrêter le mandat. Les versements déjà encaissés restent : ce sont de
// l'argent reçu, pas une intention.
export async function cancelSubscriptionApi(id) {
  const res = await http.post(`/api/subscriptions/${id}/cancel`, {});
  return res.data;
}
