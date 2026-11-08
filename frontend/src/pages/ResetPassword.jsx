import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const location = useLocation();
  const [params] = useSearchParams();
  const nav = useNavigate();

  // ✅ Token vem do link do e-mail (?token=...). Mantém o fallback antigo via state.
  const tokenDaUrl = params.get("token") || location.state?.token || "";
  const [token, setToken] = useState(tokenDaUrl);
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return toast.error("Link de recuperação inválido. Peça um novo em 'Esqueci minha senha'.");
    if (password.length < 8) return toast.error("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirmacao) return toast.error("As senhas não conferem.");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token: token.trim(), password });
      toast.success("Senha alterada! Faça login com a nova senha.");
      nav("/login", { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao redefinir senha.");
    } finally { setBusy(false); }
  };

  const inputCls = "w-full h-11 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-3xl shadow-xl space-y-6">
        <div className="text-center">
          <img src="/logo.png" alt="OmniRepMax" className="h-20 w-auto object-contain mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-foreground">Criar nova senha</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha uma senha com pelo menos 8 caracteres.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Campo de código só aparece se a pessoa não veio pelo link do e-mail */}
          {!tokenDaUrl && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Código de recuperação</label>
              <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Cole o código recebido" className={inputCls} />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Nova senha</label>
            <div className="relative">
              <input type={mostrar ? "text" : "password"} required autoComplete="new-password" value={password}
                     onChange={e => setPassword(e.target.value)} className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setMostrar(!mostrar)} aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Confirme a nova senha</label>
            <input type={mostrar ? "text" : "password"} required autoComplete="new-password" value={confirmacao}
                   onChange={e => setConfirmacao(e.target.value)} className={inputCls} />
          </div>

          <button type="submit" disabled={busy}
                  className="w-full h-11 bg-[#075BFF] hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {busy ? "Salvando..." : "Redefinir senha"}
          </button>
        </form>

        <div className="text-center text-sm space-x-4">
          <Link to="/forgot-password" className="text-[#075BFF] hover:underline">Pedir novo link</Link>
          <Link to="/login" className="text-[#075BFF] hover:underline">Voltar ao login</Link>
        </div>
      </div>
    </div>
  );
}
