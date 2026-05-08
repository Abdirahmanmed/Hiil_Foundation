import { http } from "./http";

export async function verifyOtpApi(payload) {
  const res = await http.post("/api/otp/verify", payload);
  return res.data;
}
