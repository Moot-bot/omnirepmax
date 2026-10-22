import axios from "axios";

// Pega a URL e remove qualquer barra "/" que esteja sobrando no final
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({ 
  baseURL: API_BASE, 
  withCredentials: true,
  timeout: 60000 // 60 segundos para o Render "acordar"
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("omnirep_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default api;