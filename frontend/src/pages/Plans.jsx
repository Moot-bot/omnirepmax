import React, { useEffect, useState } from "react";
import { Check, Loader2, CreditCard, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { fmtDate } from "../lib/format";
import { toast } from "sonner";

const NOME_STATUS = {
  active: "Ativa", trialing: "Ativa (em teste)", past_due: "Pagamento pendente",
  canceled: "Cancelada", unpaid: "Não paga", incomplete: "Pagamento incompleto",
  incomplete_expired: "Pagamento expirado", cortesia: "Cortesia", superadmin: "Administrador",
};

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(null); // lookup_key ou "portal"

  useEffect(() => {
    Promise.all([api.get("/plans"), api.get("/subscriptions/me")])
      .then(([p, s]) => { setPlans(p.data.plans || []); setSub(s.data); })
      .catch(() => toast.error("Erro ao carregar os planos."))
      .finally(() => setCarregando(false));
  }, []);

  const assinaturaAtiva = sub && !sub.is_trial && sub.acesso === "ativo" && sub.tem_assinatura_stripe
    && ["active", "trialing", "past_due"].includes(sub.subscription_status);

  const assinar = async (plano) => {
    setOcupado(plano.lookup_key);
    try {
      const r = await api.post("/payments/checkout", { lookup_key: plano.lookup_key, origin_url: window.location.origin });
      window.location.href = r.data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não foi possível iniciar o pagamento.");
      setOcupado(null);
    }
  };

  const abrirPortal = async () => {
    setOcupado("portal");
    try {
      const r = await api.post("/billing/portal");
      window.location.href = r.data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não foi possível abrir o portal.");
      setOcupado(null);
    }
  };

  if (carregando) {
    return <div className="p-12 flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Carregando planos…</div>;
  }

  const planoAtual = sub?.is_trial ? null : sub?.plan;

  return (
    <div className="pb-10">
      <PageHeader title="Planos e assinatura" subtitle="Escolha o plano ideal para sua representação" />

      {/* Situação atual */}
      {sub && !sub.is_superadmin && (
        <div className={`mb-8 rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between ${
          sub.acesso === "somente_leitura"
            ? "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30"
            : sub.aviso === "pagamento_pendente"
              ? "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30"
              : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}>
          <div className="flex gap-3">
            {sub.acesso === "somente_leitura" ? <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              : sub.is_trial ? <Clock className="w-6 h-6 text-[#075BFF] shrink-0" />
              : <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
            <div className="text-sm">
              {sub.acesso === "somente_leitura" ? (
                <>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {sub.motivo === "trial_expirado" ? "Seu teste grátis terminou" : "Sua assinatura está inativa"}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">Sua conta está em modo consulta. Seus dados continuam guardados; escolha um plano para voltar a cadastrar e editar.</p>
                </>
              ) : sub.is_trial ? (
                <>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Teste grátis — {sub.trial_days_left} {sub.trial_days_left === 1 ? "dia restante" : "dias restantes"}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Você está usando todos os recursos do Profissional. Assinando agora, a primeira cobrança só acontece em {fmtDate(sub.trial_ends_at)}.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Plano {plans.find(p => p.id === sub.plan)?.name || sub.plan} · {NOME_STATUS[sub.subscription_status] || sub.subscription_status}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    {sub.aviso === "pagamento_pendente"
                      ? "Não conseguimos cobrar sua forma de pagamento. Atualize para evitar a suspensão."
                      : sub.cancel_at_period_end && sub.current_period_end
                        ? `Cancelamento agendado: acesso até ${fmtDate(sub.current_period_end)}.`
                        : sub.current_period_end ? `Próxima renovação em ${fmtDate(sub.current_period_end)}.` : ""}
                  </p>
                </>
              )}
            </div>
          </div>
          {sub.tem_assinatura_stripe && sub.pagamentos_configurados && (
            <Button onClick={abrirPortal} disabled={ocupado === "portal"} variant="outline" className="shrink-0">
              {ocupado === "portal" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Gerenciar assinatura
            </Button>
          )}
        </div>
      )}

      {sub && !sub.pagamentos_configurados && (
        <div className="mb-6 text-sm text-slate-500 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4">
          {sub.is_superadmin ? (
            <>Os pagamentos não estão configurados no servidor. <Link to="/admin" className="font-semibold text-[#075BFF] underline">Abra Admin → Diagnóstico</Link> para ver o que falta.</>
          ) : (
            <>A assinatura online estará disponível em breve. Para assinar agora, fale com o suporte pelo WhatsApp (47) 99206-5908.</>
          )}
        </div>
      )}

      {/* Planos */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl">
        {plans.map(p => {
          const atual = planoAtual === p.id && sub?.acesso === "ativo";
          return (
            <div key={p.id} className={`relative rounded-2xl border p-6 flex flex-col ${
              p.featured ? "border-2 border-[#075BFF] bg-gradient-to-b from-[#075BFF]/5 to-white dark:from-[#075BFF]/15 dark:to-slate-900 shadow-lg"
                         : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#075BFF] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Mais popular</span>
              )}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
              {p.descricao && <p className="text-sm text-slate-500 mt-1">{p.descricao}</p>}
              <div className="my-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">R$ {p.price_brl}</span>
                <span className="text-slate-500">/mês</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1 text-sm text-slate-700 dark:text-slate-300">
                {p.features.map(f => (
                  <li key={f} className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              {atual ? (
                <Button disabled variant="outline" className="w-full">Plano atual</Button>
              ) : assinaturaAtiva ? (
                <Button onClick={abrirPortal} disabled={!!ocupado} variant="outline" className="w-full">
                  {ocupado === "portal" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Trocar para este plano
                </Button>
              ) : (
                <Button onClick={() => assinar(p)} disabled={!!ocupado || !sub?.pagamentos_configurados}
                        className={`w-full ${p.featured ? "bg-[#075BFF] hover:bg-blue-600" : ""}`}>
                  {ocupado === p.lookup_key && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {sub?.is_trial && sub?.acesso === "ativo" ? "Assinar (cobra no fim do teste)" : "Assinar"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 mt-6 max-w-3xl">
        Pagamento processado com segurança pelo Stripe. Cancele quando quiser em "Gerenciar assinatura" — o acesso continua até o fim do período já pago.
      </p>
    </div>
  );
}
