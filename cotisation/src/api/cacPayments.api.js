import { http } from "./http";

export async function initiateCacSubscriptionPaymentApi(subscriptionId) {
  const res = await http.post(
    `/api/cac-payments/subscriptions/${subscriptionId}/initiate`,
  );
  return res.data;
}

export async function confirmCacSubscriptionPaymentApi(subscriptionId, otp) {
  const res = await http.post(
    `/api/cac-payments/subscriptions/${subscriptionId}/confirm`,
    { otp },
  );
  return res.data;
}

export async function getCacSubscriptionPaymentStatusApi(subscriptionId) {
  const res = await http.get(
    `/api/cac-payments/subscriptions/${subscriptionId}/status`,
  );
  return res.data;
}
