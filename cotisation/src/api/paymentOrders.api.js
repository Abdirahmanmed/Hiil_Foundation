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
