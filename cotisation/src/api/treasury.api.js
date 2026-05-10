import { http } from "./http";

const basePath = "/api/treasury";

export async function getTreasuryDashboard() {
  const res = await http.get(`${basePath}/dashboard`);
  return res.data;
}
