import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const location = useLocation();
  const nav = useNavigate();
  const [token, setToken] = useState(location.state?.token || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Senha deve ter 8 caracteres");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Senha alterada com sucesso! Faça login.");
      nav("/login");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao redefinir senha");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl space-y-6">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center">Criar nova senha</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Token de Recuperação</label>
            <input type="text" value={token} onChange={e => setToken(e.target.value)} className="w-full h-11 px-4 border border-slate-300 rounded-lg text-slate-900 bg-slate-50" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Nova Senha (mín. 8)</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full h-11 px-4 border border-slate-300 rounded-lg text-slate-900" />
          </div>
          <button type="submit" disabled={busy} className="w-full h-11 bg-[#075BFF] text-white font-bold rounded-lg hover:bg-blue-600">
            {busy ? "Salvando..." : "Redefinir Senha"}
          </button>
        </form>
        <div className="text-center">
          <Link to="/login" className="text-sm text-[#075BFF] hover:underline">Voltar ao Login</Link>
        </div>
      </div>
    </div>
  );
}