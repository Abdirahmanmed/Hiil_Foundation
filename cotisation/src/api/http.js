import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://hiil-foundation-api.onrender.com",
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    // Un 401 ne signifie pas toujours « session expirée ».
    //
    // La réauthentification par mot de passe à l'approbation d'une dépense
    // renvoie 401 sur une faute de frappe : l'intercepteur déconnectait alors
    // le Super Admin au lieu d'afficher « mot de passe incorrect ». Seuls les
    // 401 portant le code SESSION_REVOKED, ou n'en portant aucun sur une route
    // de session, doivent purger la session.
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const url = error?.config?.url || "";
    const reauth = /\/(approve|reject)$/.test(url);

    if (status === 401 && !reauth) {
      localStorage.clear();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    if (status === 403 && code === "ACCOUNT_SUSPENDED") {
      localStorage.clear();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);
