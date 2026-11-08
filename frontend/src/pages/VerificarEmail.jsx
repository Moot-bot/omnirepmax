import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import api from "../lib/api";

// Rota: /verificar-email?token=...  (link enviado no e-mail de cadastro)
export default function VerificarEmail() {
  const [params] = useSearchParams();
  const [estado, setEstado] = useState("carregando"); // carregando | ok | erro
  const [mensagem, setMensagem] = useState("");
  const enviado = useRef(false); // evita chamada dupla no StrictMode (token é de uso único)

  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    const token = params.get("token");
    if (!token) { setEstado("erro"); setMensagem("Link incompleto."); return; }
    api.post("/auth/verify-email", { token })
      .then(() => setEstado("ok"))
      .catch(e => { setEstado("erro"); setMensagem(e.response?.data?.detail || "Não foi possível confirmar o e-mail."); });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#09090B] px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
        {estado === "carregando" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-[#075BFF]" />
            <p className="text-slate-600 dark:text-slate-300">Confirmando seu e-mail…</p>
          </>
        )}
        {estado === "ok" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">E-mail confirmado!</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Tudo certo. Você já pode usar o OmniRepMax normalmente.</p>
            <Link to="/dashboard" className="inline-block bg-[#075BFF] hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg">Ir para o sistema</Link>
          </>
        )}
        {estado === "erro" && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-rose-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Não deu certo</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{mensagem} Entre no sistema para pedir um novo link.</p>
            <Link to="/login" className="inline-block bg-[#075BFF] hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg">Entrar</Link>
          </>
        )}
      </div>
    </div>
  );
}
