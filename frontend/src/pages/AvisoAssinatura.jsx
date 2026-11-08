import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Clock, CreditCard, X } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

/**
 * Aviso flutuante (canto inferior direito) sobre a assinatura.
 * - Teste acabando (≤ 3 dias)        → amarelo, pode fechar
 * - Pagamento recusado (past_due)    → amarelo, botão para atualizar cartão
 * - Teste vencido / assinatura inativa → vermelho, modo consulta
 */
export default function AvisoAssinatura() {
  const { pathname } = useLocation();
  const [sub, setSub] = useState(null);
  const [fechado, setFechado] = useState(false);
  const [abrindo, setAbrindo] = useState(false);

  useEffect(() => {
    let vivo = true;
    api.get("/subscriptions/me").then(r => vivo && setSub(r.data)).catch(() => {});
    return () => { vivo = false; };
  }, [pathname]);

  if (!sub || sub.is_superadmin || pathname === "/planos") return null;

  const abrirPortal = async () => {
    setAbrindo(true);
    try {
      const r = await api.post("/billing/portal");
      window.location.href = r.data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não foi possível abrir o portal de pagamento.");
      setAbrindo(false);
    }
  };

  let aviso = null;
  if (sub.acesso === "somente_leitura") {
    aviso = {
      cor: "rose", icone: AlertTriangle, fechavel: false,
      titulo: sub.motivo === "trial_expirado" ? "Seu teste terminou" : "Assinatura inativa",
      texto: "Você pode consultar e exportar seus dados, mas não cadastrar nem editar.",
      acao: <Link to="/planos" className="font-semibold underline">Escolher plano</Link>,
    };
  } else if (sub.aviso === "pagamento_pendente") {
    aviso = {
      cor: "amber", icone: CreditCard, fechavel: true,
      titulo: "Pagamento não aprovado",
      texto: "Atualize sua forma de pagamento para evitar a suspensão.",
      acao: <button onClick={abrirPortal} disabled={abrindo} className="font-semibold underline">{abrindo ? "Abrindo…" : "Atualizar pagamento"}</button>,
    };
  } else if (sub.is_trial && sub.trial_days_left != null && sub.trial_days_left <= 3) {
    aviso = {
      cor: "amber", icone: Clock, fechavel: true,
      titulo: sub.trial_days_left <= 1 ? "Seu teste termina hoje" : `Seu teste termina em ${sub.trial_days_left} dias`,
      texto: "Assine agora: a primeira cobrança só acontece quando o teste acabar.",
      acao: <Link to="/planos" className="font-semibold underline">Ver planos</Link>,
    };
  }

  if (!aviso || (aviso.fechavel && fechado)) return null;
  const Icone = aviso.icone;
  const cores = aviso.cor === "rose"
    ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200"
    : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200";

  return (
    <div role="status" className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 border rounded-xl shadow-lg p-4 flex gap-3 ${cores}`}>
      <Icone className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-bold">{aviso.titulo}</p>
        <p className="opacity-90 mt-0.5">{aviso.texto}</p>
        <div className="mt-2">{aviso.acao}</div>
      </div>
      {aviso.fechavel && (
        <button onClick={() => setFechado(true)} aria-label="Fechar aviso" className="self-start opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
