import axios from "axios";

export const http = axios.create({
  baseURL: "https://cotisation-backend.onrender.com",
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
