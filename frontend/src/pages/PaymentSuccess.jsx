import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import api from "../lib/api";
import { atualizarAssinatura } from "../lib/assinatura";
import { fmtDate } from "../lib/format";

const NOME_PLANO = { solo: "Solo", pro: "Profissional", equipe: "Equipe" };
const TENTATIVAS = 10;
const INTERVALO_MS = 2000;

/**
 * Volta do Stripe (/payment/success?session_id=...).
 * Confere o pagamento no máximo 10 vezes e PARA assim que confirma (antes recomeçava e piscava).
 */
export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [estado, setEstado] = useState("conferindo"); // conferindo | ok | demorando | erro
  const [tentativa, setTentativa] = useState(0);
  const [info, setInfo] = useState(null);
  const iniciou = useRef(false);

  useEffect(() => {
    if (iniciou.current) return;          // roda uma única vez (inclusive no modo de desenvolvimento)
    iniciou.current = true;
    if (!sessionId) { setEstado("erro"); return; }

    let cancelado = false;
    const conferir = async () => {
      for (let i = 1; i <= TENTATIVAS && !cancelado; i++) {
        setTentativa(i);
        try {
          const r = await api.get(`/payments/status/${sessionId}`);
          if (r.data.payment_status === "paid") {
            const sub = await atualizarAssinatura();
            if (!cancelado) { setInfo({ plano: r.data.plan_id, sub }); setEstado("ok"); }
            return;
          }
        } catch (e) {
          if (e.response?.status === 404) { if (!cancelado) setEstado("erro"); return; }
        }
        await new Promise(res => setTimeout(res, INTERVALO_MS));
      }
      if (!cancelado) setEstado("demorando");
    };
    conferir();
    return () => { cancelado = true; };
  }, [sessionId]);

  const plano = NOME_PLANO[info?.plano] || NOME_PLANO[info?.sub?.plan] || "";
  const emTeste = info?.sub?.subscription_status === "trialing";
  const primeiraCobranca = info?.sub?.trial_ends_at || info?.sub?.current_period_end;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#09090B] p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 text-center">
        {estado === "conferindo" && (
          <>
            <Loader2 className="w-14 h-14 mx-auto text-[#075BFF] animate-spin" />
            <h1 className="mt-6 text-2xl font-extrabold text-slate-900 dark:text-white">Confirmando pagamento…</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Aguardando a confirmação do Stripe ({tentativa}/{TENTATIVAS})</p>
          </>
        )}

        {estado === "ok" && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
            <h1 className="mt-6 text-2xl font-extrabold text-slate-900 dark:text-white">Assinatura confirmada! 🎉</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {plano ? <>Seu plano <b className="text-slate-900 dark:text-white">{plano}</b> está ativo.</> : "Sua assinatura está ativa."}
            </p>
            {emTeste && primeiraCobranca && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Você continua no teste grátis. A primeira cobrança será em <b>{fmtDate(primeiraCobranca)}</b>.
              </p>
            )}
            <div className="mt-8 space-y-3">
              <Link to="/dashboard" className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white font-bold">
                Ir para o Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/planos" className="flex items-center justify-center h-12 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
                Ver minha assinatura
              </Link>
            </div>
          </>
        )}

        {(estado === "demorando" || estado === "erro") && (
          <>
            <AlertTriangle className="w-14 h-14 mx-auto text-amber-500" />
            <h1 className="mt-6 text-2xl font-extrabold text-slate-900 dark:text-white">
              {estado === "erro" ? "Não encontramos este pagamento" : "A confirmação está demorando"}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {estado === "erro"
                ? "Se você concluiu o pagamento, ele aparecerá em Planos em alguns instantes."
                : "Se o pagamento foi aprovado, sua assinatura será ativada automaticamente em alguns minutos. Nenhuma cobrança será duplicada."}
            </p>
            <div className="mt-8 space-y-3">
              <Link to="/planos" className="flex items-center justify-center h-12 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white font-bold">Ver minha assinatura</Link>
              <Link to="/dashboard" className="flex items-center justify-center h-12 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold">Ir para o Dashboard</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
