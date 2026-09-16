import { http } from "./http";

const basePath = "/api/payment-orders";

export async function createPaymentOrder(payload) {
  const res = await http.post(basePath, payload);
  return res.data;
}

export async function getPaymentOrders() {
  const res = await http.get(basePath);
  return res.data;
}

export async function getPaymentOrderPrint(id) {
  const res = await http.get(`${basePath}/${id}/print`);
  return res.data;
}

export async function markPaymentOrderPrinted(id) {
  const res = await http.post(`${basePath}/${id}/print`, {});
  return res.data;
}

// L'argent a réellement quitté la banque. « Engagé » et « réellement payé »
// sont deux chiffres différents.
export async function markPaymentOrderExecuted(id, executedAt) {
  const res = await http.post(`${basePath}/${id}/execute`, { executedAt });
  return res.data;
}

// Annulation. Le serveur tranche selon l'état : un ordre imprimé exige le
// Super Admin, un ordre exécuté ne s'annule jamais.
export async function cancelPaymentOrder(id, reason) {
  const res = await http.post(`${basePath}/${id}/cancel`, { reason });
  return res.data;
}
