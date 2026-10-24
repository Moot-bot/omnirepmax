import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.token) localStorage.setItem("omnirep_token", data.token);
    setUser(data.user);
    return data.user;
  };
  const refresh = async () => {
    try { const { data } = await api.get("/auth/me"); setUser(data); } catch {}
  };
  const logout = async () => {
      try {
          await api.post("/auth/logout");
      } catch (e) {
          console.log("Erro ao deslogar no servidor", e);
      } finally {
          // Força a limpeza do navegador
          localStorage.removeItem("omnirep_token");
          localStorage.clear(); // Limpa tudo por garantia
          setUser(null);
          // Opcional: Redirecionar forçando recarregamento da página
          window.location.href = "/login";
      }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
