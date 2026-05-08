import { http } from "./http";

export async function registerApi(formData) {
  const res = await http.post("/api/auth/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function loginApi(payload) {
  const res = await http.post("/api/auth/login", payload);
  return res.data;
}
