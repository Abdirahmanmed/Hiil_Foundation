import { http } from "./http";

const basePath = "/api/expenses";

export async function getExpensesDashboard() {
  const res = await http.get(`${basePath}/dashboard`);
  return res.data;
}

export async function getExpenses() {
  const res = await http.get(basePath);
  return res.data;
}

// Chronologie complete d'un dossier : qui a engage, qui a approuve, qui a
// decaisse. Reservee aux roles de supervision.
export async function getExpenseTrail(id) {
  const res = await http.get(`${basePath}/${id}/trail`);
  return res.data;
}

export async function createExpense(payload) {
  const res = await http.post(basePath, payload);
  return res.data;
}

export async function approveExpense(id) {
  const res = await http.patch(`${basePath}/${id}/approve`, {});
  return res.data;
}

export async function rejectExpense(id) {
  const res = await http.patch(`${basePath}/${id}/reject`, {});
  return res.data;
}
