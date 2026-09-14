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

// Activation d'un compte interne par son titulaire (route publique).
export async function acceptInviteApi(payload) {
  const res = await http.post("/api/auth/invite/accept", payload);
  return res.data;
}

// Mot de passe oublié. La réponse est volontairement identique que l'adresse
// existe ou non : cette route ne doit pas devenir un énumérateur de comptes.
export async function forgotPasswordApi(payload) {
  const res = await http.post("/api/auth/password/forgot", payload);
  return res.data;
}

export async function resetPasswordApi(payload) {
  const res = await http.post("/api/auth/password/reset", payload);
  return res.data;
}

export async function changePassword(payload) {
  const res = await http.patch("/api/auth/change-password", payload);
  return res.data;
}
