import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach token from localStorage as Authorization bearer fallback (cookie still primary)
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("session_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default api;
