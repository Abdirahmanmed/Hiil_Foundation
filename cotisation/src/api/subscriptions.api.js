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
