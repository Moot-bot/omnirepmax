import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { CheckCircle2, Loader2, XCircle, ArrowRight } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sid = params.get("session_id");
  const [state, setState] = useState({ loading: true, status: null, plan: null });
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sid) { setState({ loading: false, status: "no_session" }); return; }
    let cancelled = false;
    const poll = async (n) => {
      try {
        const { data } = await api.get(`/payments/status/${sid}`);
        if (cancelled) return;
        if (data.payment_status === "paid") {
          setState({ loading: false, status: "paid", plan: data.plan_id });
          // refresh auth so plan shows updated
          setTimeout(() => window.location.reload(), 100);
        } else if (data.status === "failed" || data.status === "expired") {
          setState({ loading: false, status: data.status });
        } else if (n < 10) {
          setAttempts(n + 1);
          setTimeout(() => poll(n + 1), 2000);
        } else {
          setState({ loading: false, status: "timeout" });
        }
      } catch (e) { if (!cancelled) setState({ loading: false, status: "error" }); }
    };
    poll(0);
    return () => { cancelled = true; };
  }, [sid]);

  const paid = state.status === "paid";
  const Icon = state.loading ? Loader2 : paid ? CheckCircle2 : XCircle;
  const color = paid ? "text-emerald-500" : state.loading ? "text-[#075BFF]" : "text-rose-500";
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <Icon className={`w-16 h-16 mx-auto ${color} ${state.loading ? "animate-spin" : ""}`} />
        <h1 className="font-display text-2xl font-extrabold mt-5">
          {state.loading ? "Confirmando pagamento..." : paid ? "Pagamento confirmado! 🎉" : "Pagamento não confirmado"}
        </h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          {state.loading ? `Aguardando confirmação do Stripe... (${attempts}/10)` : paid ? `Seu plano ${state.plan || ""} está ativo. Bem-vindo ao OMNIREP MAX completo!` : "Não foi possível confirmar o pagamento. Tente novamente ou escolha outro plano."}
        </p>
        {!state.loading && (
          <div className="mt-6 space-y-2">
            <Link to="/"><Button className="w-full bg-brand-cta hover:brightness-110 text-white border-0">Ir para o Dashboard <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
            <Link to="/planos"><Button variant="outline" className="w-full">Ver planos</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
}
