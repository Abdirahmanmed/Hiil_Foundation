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

// Approuver engage une sortie d'argent : le mot de passe du Super Admin est
// redemandé. Un JWT volé ou un poste laissé ouvert ne suffit plus.
export async function approveExpense(id, password) {
  const res = await http.patch(`${basePath}/${id}/approve`, { password });
  return res.data;
}

// Rejeter sans motif rend l'audit muet.
export async function rejectExpense(id, reason) {
  const res = await http.patch(`${basePath}/${id}/reject`, { reason });
  return res.data;
}
