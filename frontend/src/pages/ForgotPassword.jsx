import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Logo from "../components/Logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      if (data.token) {
        setToken(data.token); // Mostra o token para testes locais
        toast.success("Token gerado! Use-o para redefinir a senha.");
      } else {
        toast.success("Se o e-mail existir, um link foi enviado.");
      }
    } catch (e) {
      toast.error("Erro ao solicitar recuperação.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl space-y-6">
        <div className="flex justify-center mb-4"><Logo variant="wordmark" size={40} /></div>
        <h2 className="text-2xl font-extrabold text-slate-900 text-center">Recuperar senha</h2>
        
        {!token ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Digite seu e-mail</label>
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#075BFF] outline-none" 
              />
            </div>
            <button type="submit" disabled={busy} className="w-full h-11 bg-[#075BFF] text-white font-bold rounded-lg hover:bg-blue-600 transition-colors">
              {busy ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">Como não temos servidor de e-mail configurado, este é o seu token de teste:</p>
            <code className="block p-3 bg-slate-100 text-slate-900 rounded-lg text-xs break-all">{token}</code>
            <Link to="/reset-password" state={{ token }} className="block w-full py-3 bg-[#075BFF] text-white font-bold rounded-lg">
              Ir para Redefinir Senha
            </Link>
          </div>
        )}
        
        <div className="text-center">
          <Link to="/login" className="text-sm text-slate-500 hover:text-[#075BFF] flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}