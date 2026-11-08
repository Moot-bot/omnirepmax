import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Clock, CreditCard, X } from "lucide-react";
import api from "../lib/api";
import { useAssinatura } from "../lib/assinatura";
import { toast } from "sonner";

/**
 * Aviso flutuante (canto inferior direito), complementar à faixa do topo:
 * - Teste acabando (≤ 3 dias)     → amarelo, pode fechar
 * - Pagamento recusado (past_due) → amarelo, botão para atualizar cartão
 * Conta travada (modo consulta) é mostrada pela faixa vermelha do AppShell.
 */
export default function AvisoAssinatura() {
  const { pathname } = useLocation();
  const sub = useAssinatura();
  const [fechado, setFechado] = useState(false);
  const [abrindo, setAbrindo] = useState(false);

  if (!sub || sub.is_superadmin || pathname === "/planos" || sub.acesso !== "ativo") return null;

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
  if (sub.aviso === "pagamento_pendente") {
    aviso = {
      icone: CreditCard,
      titulo: "Pagamento não aprovado",
      texto: "Atualize sua forma de pagamento para evitar a suspensão.",
      acao: <button onClick={abrirPortal} disabled={abrindo} className="font-semibold underline">{abrindo ? "Abrindo…" : "Atualizar pagamento"}</button>,
    };
  } else if (sub.is_trial && sub.trial_days_left != null && sub.trial_days_left <= 3) {
    aviso = {
      icone: Clock,
      titulo: sub.trial_days_left <= 1 ? "Seu teste termina hoje" : `Seu teste termina em ${sub.trial_days_left} dias`,
      texto: "Assine agora: a primeira cobrança só acontece quando o teste acabar.",
      acao: <Link to="/planos" className="font-semibold underline">Ver planos</Link>,
    };
  }

  if (!aviso || fechado) return null;
  const Icone = aviso.icone;

  return (
    <div role="status" className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 border rounded-xl shadow-lg p-4 flex gap-3 bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200">
      <Icone className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-bold">{aviso.titulo}</p>
        <p className="opacity-90 mt-0.5">{aviso.texto}</p>
        <div className="mt-2">{aviso.acao}</div>
      </div>
      <button onClick={() => setFechado(true)} aria-label="Fechar aviso" className="self-start opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
