import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function ForgotPassword() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState("ask");
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const req = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      if (data.token) { setToken(data.token); setStage("reset"); toast.success("Token gerado (modo DEV). Em produção, enviaríamos por e-mail."); }
      else toast.success(data.message || "Se o e-mail existir, instruções foram enviadas");
    } catch (e) { toast.error("Erro ao solicitar reset"); } finally { setBusy(false); }
  };

  const reset = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/auth/reset-password", { token, password: pw }); toast.success("Senha redefinida! Faça login."); window.location.href = "/login"; }
    catch (e) { toast.error(e?.response?.data?.detail || "Erro ao redefinir"); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="mb-6">
          <Logo variant="wordmark" size={34} onDark={false} />
        </div>
        <h2 className="font-display text-2xl font-extrabold mb-2 text-[#152238]">{stage === "ask" ? "Recuperar senha" : "Nova senha"}</h2>
        <p className="text-sm text-slate-500 mb-6">{stage === "ask" ? "Digite seu e-mail. Enviaremos um link de redefinição." : "Defina sua nova senha para continuar."}</p>
        {stage === "ask" ? (
          <form onSubmit={req} className="space-y-4">
            <div className="space-y-1"><Label>E-mail</Label><Input data-testid="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button type="submit" disabled={busy} className="w-full bg-brand-cta hover:brightness-110 text-white border-0 shadow-md shadow-[#075BFF]/20">{busy ? "Enviando..." : "Solicitar reset"}</Button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            <div className="space-y-1"><Label>Token</Label><Input value={token} onChange={(e) => setToken(e.target.value)} className="font-mono text-xs" /></div>
            <div className="space-y-1"><Label>Nova senha (mín. 6)</Label><Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <Button type="submit" disabled={busy} className="w-full bg-brand-cta hover:brightness-110 text-white border-0 shadow-md shadow-[#075BFF]/20">{busy ? "Salvando..." : "Redefinir senha"}</Button>
          </form>
        )}
        <div className="mt-6 text-sm text-center"><Link to="/login" className="text-slate-500 hover:text-[#075BFF]">← Voltar para login</Link></div>
      </div>
    </div>
  );
}
