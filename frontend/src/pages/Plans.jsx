import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Check, Zap, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function Plans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data.plans));
    api.get("/subscriptions/me").then((r) => setSub(r.data));
  }, []);

  const subscribe = async (plan) => {
    setLoadingId(plan.id);
    try {
      const { data } = await api.post("/payments/checkout", { lookup_key: plan.lookup_key, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erro ao iniciar checkout");
      setLoadingId(null);
    }
  };

  const current = sub?.plan;
  return (
    <div>
      <PageHeader title="Planos e Assinatura" subtitle="Escolha o plano ideal para sua operação comercial" />
      {sub && (
        <div className="mb-6 p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden"
             style={{ backgroundImage: "linear-gradient(135deg, #061329 0%, #0A1F46 55%, #075BFF 100%)" }}>
          <div className="relative">
            <div className="text-xs uppercase tracking-wider text-[#22D3EE] font-semibold">Plano atual</div>
            <div className="font-display text-2xl font-extrabold mt-1 capitalize">{current}</div>
            {sub.is_trial && typeof sub.trial_days_left === "number" && (
              <div className="text-sm mt-2 text-slate-300">
                {sub.trial_days_left > 0 ? <>⏱️ Trial expira em <strong className="text-white">{sub.trial_days_left} dia{sub.trial_days_left !== 1 ? "s" : ""}</strong>. Garanta seu acesso contínuo escolhendo um plano.</> : <>⚠️ Seu trial expirou. Escolha um plano para continuar usando o OMNIREP MAX.</>}
              </div>
            )}
            {sub.subscription_status === "active" && <div className="text-sm mt-2 text-emerald-300">✓ Assinatura ativa</div>}
          </div>
          {sub.is_trial && <div className="text-xs text-slate-400">Sem compromisso. Cancele quando quiser.</div>}
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => {
          const featured = p.featured;
          const isCurrent = current === p.id;
          return (
            <div key={p.id} data-testid={`plan-card-${p.id}`} className={`relative p-6 rounded-2xl border transition-all ${featured ? "border-[#075BFF] bg-gradient-to-br from-white to-[#EFF6FF] shadow-xl scale-[1.02]" : "border-slate-200 bg-white shadow-sm hover:shadow-md"} dark:bg-slate-900 dark:border-slate-800`}>
              {featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-cta text-white text-xs font-bold shadow-md shadow-[#075BFF]/30">Mais escolhido</div>}
              {isCurrent && <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Atual</div>}
              <div className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">{p.name}</div>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-sm text-slate-500">R$</span>
                <span className="font-display text-5xl font-extrabold tracking-tight">{p.price_brl}</span>
                <span className="text-sm text-slate-500">/mês</span>
              </div>
              <Button data-testid={`btn-subscribe-${p.id}`} disabled={loadingId === p.id || isCurrent} onClick={() => subscribe(p)} className={`w-full mt-5 h-11 border-0 ${featured ? "bg-brand-cta hover:brightness-110 text-white shadow-md shadow-[#075BFF]/20" : "bg-[#0A1F46] hover:bg-[#0A1F46]/90 text-white"}`}>
                {loadingId === p.id ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Carregando...</> : isCurrent ? "Plano atual" : <>Assinar <ArrowRight className="w-4 h-4 ml-1" /></>}
              </Button>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-start gap-2">
        <Zap className="w-4 h-4 text-[#075BFF] shrink-0 mt-0.5" />
        <div><strong>Pagamento seguro via Stripe.</strong> Modo de teste ativo — use o cartão <span className="font-mono">4242 4242 4242 4242</span>, validade futura, qualquer CVC. Em produção, aceita Pix, boleto e cartão.</div>
      </div>
    </div>
  );
}
