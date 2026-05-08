import { http } from "./http";

// ⚠️ si ton backend est monté sur /admin (comme ton app.use("/admin", ...))
const basePath = "/api/admin";

export async function getAdminDashboard() {
  const res = await http.get(`${basePath}/dashboard`);
  return res.data; // { stats }
}

export async function getAdminUsers() {
  const res = await http.get(`${basePath}/users`);
  return res.data; // { users }
}

export async function getAdminSubscriptions() {
  const res = await http.get(`${basePath}/subscriptions`);
  return res.data; // { subscriptions }
}

export async function patchUserStatus(userId, status) {
  const res = await http.patch(`${basePath}/users/${userId}/status`, {
    status,
  });
  return res.data; // { user }
}

export async function patchUserRole(userId, role) {
  const res = await http.patch(`${basePath}/users/${userId}/role`, { role });
  return res.data; // { user }
}

export async function resetUserOtp(userId) {
  const res = await http.post(`${basePath}/users/${userId}/otp/reset`, {});
  return res.data; // { otpSecurity }
}

export async function patchSubscriptionStatus(subscriptionId, status) {
  const res = await http.patch(
    `${basePath}/subscriptions/${subscriptionId}/status`,
    { status },
  );
  return res.data; // { subscription }
}

export async function forceSubscriptionConsent(
  subscriptionId,
  consentVersion = "admin_force_v1",
) {
  const res = await http.post(
    `${basePath}/subscriptions/${subscriptionId}/consent/force`,
    {
      consentVersion,
    },
  );
  return res.data; // { subscription }
}

export async function getUserDetails(userId) {
  const res = await http.get(`${basePath}/users/${userId}/details`);
  return res.data; // { user }
}

export async function getAudit(params = {}) {
  const res = await http.get(`${basePath}/audit`, { params });
  return res.data; // { items, total }
}
