import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Users, Clock, CreditCard, Gift, Lock, Search, Download, Loader2, Trash2,
  Settings2, Star, ExternalLink, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2, XCircle, HelpCircle, Stethoscope
} from "lucide-react";
import { fmtBRL, fmtDate } from "../lib/format";
import { toast } from "sonner";

const PRECO = { solo: 39, pro: 69, equipe: 99 };
const NOME_PLANO = { solo: "Solo", pro: "Profissional", equipe: "Equipe", trial: "Teste" };

// Classificação usada nos filtros, nos cartões e no selo de cada conta
function categoria(u) {
  if (u.is_superadmin) return "admin";
  if (u.acesso !== "ativo") return u.motivo === "trial_expirado" ? "teste_vencido" : "inativa";
  if (u.subscription_status === "cortesia") return "cortesia";
  if (u.plan === "trial") return "teste";
  return "pagante";
}

function Selo({ u }) {
  const c = categoria(u);
  const base = "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap";
  if (c === "admin") return <span className={`${base} bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200`}><ShieldCheck className="w-3 h-3" /> Administrador</span>;
  if (c === "teste") return <span className={`${base} ${u.dias_restantes <= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"}`}><Clock className="w-3 h-3" /> Teste · {u.dias_restantes <= 1 ? "último dia" : `${u.dias_restantes} dias`}</span>;
  if (c === "teste_vencido") return <span className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300`}><Lock className="w-3 h-3" /> Teste vencido</span>;
  if (c === "inativa") return <span className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300`}><Lock className="w-3 h-3" /> Inativa</span>;
  if (c === "cortesia") return <span className={`${base} bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300`}><Gift className="w-3 h-3" /> Cortesia {NOME_PLANO[u.plan]}{u.cortesia_ate ? ` até ${fmtDate(u.cortesia_ate)}` : ""}</span>;
  return <span className={`${base} ${u.subscription_status === "past_due" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"}`}><CreditCard className="w-3 h-3" /> {NOME_PLANO[u.plan] || u.plan}{u.subscription_status === "past_due" ? " · pgto pendente" : u.subscription_status === "trialing" ? " · em teste" : ""}{u.cancel_at_period_end ? " · cancelando" : ""}</span>;
}

function Kpi({ icone: Icone, rotulo, valor, cor }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{rotulo}</span>
        <Icone className={`w-4 h-4 ${cor}`} />
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{valor}</div>
    </div>
  );
}

export default function Admin() {
  const [aba, setAba] = useState("contas");
  const [contas, setContas] = useState([]);
  const [leads, setLeads] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todas");

  const [sel, setSel] = useState(null);         // conta aberta no modal
  const [dados, setDados] = useState({ name: "", empresa: "", telefone: "" });
  const [dias, setDias] = useState(7);
  const [cortesia, setCortesia] = useState({ plano: "pro", ate: "" });
  const [salvando, setSalvando] = useState(null);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [diag, setDiag] = useState(null);
  const [diagCarregando, setDiagCarregando] = useState(false);

  const carregarDiag = useCallback(async () => {
    setDiagCarregando(true);
    try { setDiag((await api.get("/admin/diagnostico")).data); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro ao rodar o diagnóstico."); }
    finally { setDiagCarregando(false); }
  }, []);
  useEffect(() => { if (aba === "diagnostico" && !diag) carregarDiag(); }, [aba, diag, carregarDiag]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [c, l, f] = await Promise.all([api.get("/admin/assinantes"), api.get("/leads"), api.get("/admin/feedbacks")]);
      setContas(c.data); setLeads(l.data); setFeedbacks(f.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao carregar o painel.");
    } finally { setCarregando(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const kpis = useMemo(() => {
    const cats = contas.map(categoria);
    const pagantes = contas.filter(u => categoria(u) === "pagante" && u.subscription_status !== "trialing");
    return {
      total: contas.filter(u => !u.is_superadmin).length,
      teste: cats.filter(c => c === "teste").length,
      pagantes: pagantes.length,
      cortesia: cats.filter(c => c === "cortesia").length,
      travadas: cats.filter(c => c === "teste_vencido" || c === "inativa").length,
      mrr: pagantes.reduce((s, u) => s + (PRECO[u.plan] || 0), 0),
    };
  }, [contas]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contas.filter(u => {
      const c = categoria(u);
      if (filtro === "teste" && c !== "teste") return false;
      if (filtro === "pagantes" && c !== "pagante") return false;
      if (filtro === "cortesia" && c !== "cortesia") return false;
      if (filtro === "travadas" && c !== "teste_vencido" && c !== "inativa") return false;
      if (!q) return true;
      return [u.name, u.email, u.empresa, u.telefone].some(v => (v || "").toLowerCase().includes(q));
    });
  }, [contas, busca, filtro]);

  const abrir = (u) => {
    setSel(u);
    setDados({ name: u.name || "", empresa: u.empresa || "", telefone: u.telefone || "" });
    setDias(7);
    setCortesia({ plano: u.subscription_status === "cortesia" ? u.plan : "pro", ate: "" });
  };

  const alterar = async (payload, rotulo, sucesso) => {
    setSalvando(rotulo);
    try {
      await api.patch(`/admin/assinantes/${sel.id}`, payload);
      toast.success(sucesso);
      const r = await api.get("/admin/assinantes");
      setContas(r.data);
      setSel(r.data.find(x => x.id === sel.id) || null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não foi possível salvar.");
    } finally { setSalvando(null); }
  };

  const excluir = async () => {
    setSalvando("excluir");
    try {
      const r = await api.post(`/admin/assinantes/${sel.id}/excluir`, { confirmacao_email: confirmEmail });
      toast.success(`Conta excluída${r.data.stripe_cancelado ? " e assinatura cancelada no Stripe" : ""}.`);
      setExcluirOpen(false); setSel(null); setConfirmEmail("");
      carregar();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não foi possível excluir a conta.");
    } finally { setSalvando(null); }
  };

  const exportarLeads = async () => {
    try {
      const r = await api.get("/leads/export", { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = `leads_omnirepmax_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Erro ao exportar os leads."); }
  };

  const Spinner = ({ k }) => salvando === k ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null;
  const thCls = "px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide";

  return (
    <div className="pb-10">
      <PageHeader title="Painel Admin" subtitle="Contas, assinaturas, leads e feedbacks da plataforma" actions={
        <Button variant="outline" onClick={carregar} disabled={carregando}>
          <RefreshCw className={`w-4 h-4 mr-2 ${carregando ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      } />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <Kpi icone={Users} rotulo="Contas" valor={kpis.total} cor="text-slate-500" />
        <Kpi icone={Clock} rotulo="Em teste" valor={kpis.teste} cor="text-blue-500" />
        <Kpi icone={CreditCard} rotulo="Pagantes" valor={kpis.pagantes} cor="text-emerald-500" />
        <Kpi icone={Gift} rotulo="Cortesia" valor={kpis.cortesia} cor="text-purple-500" />
        <Kpi icone={Lock} rotulo="Travadas" valor={kpis.travadas} cor="text-rose-500" />
        <Kpi icone={Star} rotulo="Receita mensal" valor={fmtBRL(kpis.mrr)} cor="text-amber-500" />
      </div>

      <Tabs value={aba} onValueChange={setAba} className="mb-4">
        <TabsList>
          <TabsTrigger value="contas">Contas ({contas.length})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="feedbacks">Feedbacks ({feedbacks.length})</TabsTrigger>
          <TabsTrigger value="diagnostico"><Stethoscope className="w-3.5 h-3.5 mr-1" /> Diagnóstico</TabsTrigger>
        </TabsList>
      </Tabs>

      {aba === "contas" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail, empresa ou telefone" className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[["todas", "Todas"], ["teste", "Em teste"], ["pagantes", "Pagantes"], ["cortesia", "Cortesia"], ["travadas", "Travadas"]].map(([v, r]) => (
                <button key={v} onClick={() => setFiltro(v)}
                        className={`px-3 h-9 rounded-full text-sm font-medium border transition-colors ${filtro === v
                          ? "bg-[#075BFF] border-[#075BFF] text-white"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#075BFF]"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className={thCls}>Conta</th>
                  <th className={thCls}>Situação</th>
                  <th className={thCls}>Uso</th>
                  <th className={thCls}>Cadastro</th>
                  <th className={thCls}>Último acesso</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {lista.map(u => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{u.name || "—"}</div>
                      <div className="text-xs text-slate-500">{u.email}{u.email_verified === false && <span className="ml-1 text-amber-600">(não confirmado)</span>}</div>
                      {u.empresa && <div className="text-xs text-slate-400">{u.empresa}</div>}
                    </td>
                    <td className="px-4 py-3"><Selo u={u} /></td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{u.uso?.pedidos || 0} pedidos · {u.uso?.clientes || 0} clientes</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{u.last_login_at ? fmtDate(u.last_login_at) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {!u.is_superadmin && (
                        <Button size="sm" variant="outline" onClick={() => abrir(u)}><Settings2 className="w-3.5 h-3.5 mr-1" /> Gerenciar</Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!carregando && lista.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-500">Nenhuma conta encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === "leads" && (
        <>
          <div className="flex justify-end mb-3">
            <Button variant="outline" onClick={exportarLeads}><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className={thCls}>Nome</th><th className={thCls}>Contato</th><th className={thCls}>Operação</th>
                  <th className={thCls}>Controle atual</th><th className={thCls}>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3"><div className="font-semibold text-slate-900 dark:text-white">{l.name}</div><div className="text-xs text-slate-400">{l.empresa}</div></td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      <div>{l.email}</div>
                      {l.telefone && (
                        <a href={`https://wa.me/55${(l.telefone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-1">
                          {l.telefone} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{l.tamanho_operacao}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{l.controle_atual}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
                {!carregando && leads.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">Nenhum lead ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === "feedbacks" && (
        <div className="grid md:grid-cols-2 gap-4">
          {feedbacks.map((f, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{f.user_name || f.user_email}</div>
                  <div className="text-xs text-slate-500">{f.user_email} · {fmtDate(f.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{f.tipo}</span>
                  {f.nota != null && <span className="text-sm font-bold text-amber-500">{"★".repeat(Math.max(0, Math.min(5, f.nota)))}</span>}
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{f.mensagem}</p>
            </div>
          ))}
          {!carregando && feedbacks.length === 0 && <p className="text-slate-500">Nenhum feedback ainda.</p>}
        </div>
      )}

      {aba === "diagnostico" && (
        <div className="space-y-4 max-w-4xl">
          <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            !diag ? "border-slate-200 dark:border-slate-800" : diag.pronto_para_cobrar
              ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30"
              : "border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30"}`}>
            <div className="text-sm">
              <p className="font-bold text-slate-900 dark:text-white">
                {!diag ? "Conferindo a configuração…" : diag.pronto_para_cobrar
                  ? `Pronto para cobrar (Stripe em modo ${diag.modo_stripe})`
                  : "Ainda falta configuração para cobrar"}
              </p>
              <p className="text-slate-600 dark:text-slate-300">Confere chaves, preços dos planos, webhook e portal do cliente no servidor que está no ar.</p>
            </div>
            <Button variant="outline" onClick={carregarDiag} disabled={diagCarregando}>
              <RefreshCw className={`w-4 h-4 mr-2 ${diagCarregando ? "animate-spin" : ""}`} /> Conferir de novo
            </Button>
          </div>
          {(diag?.itens || []).map((i, n) => (
            <div key={n} className="flex gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              {i.ok === true ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                : i.ok === false ? <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                : <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />}
              <div className="text-sm min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">{i.item}</p>
                {i.detalhe && <p className="text-slate-600 dark:text-slate-400 break-words">{i.detalhe}</p>}
                {i.como_resolver && <p className="mt-1 text-[#075BFF] dark:text-cyan-400"><b>Como resolver:</b> {i.como_resolver}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de gestão da conta */}
      <Dialog open={!!sel && !excluirOpen} onOpenChange={v => !v && setSel(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {sel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">{sel.name || sel.email} <Selo u={sel} /></DialogTitle>
                <p className="text-sm text-slate-500">{sel.email} · cadastro em {fmtDate(sel.created_at)}</p>
              </DialogHeader>

              {/* Dados */}
              <section className="space-y-3 py-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dados da conta</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Nome</Label><Input value={dados.name} onChange={e => setDados({ ...dados, name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Empresa</Label><Input value={dados.empresa} onChange={e => setDados({ ...dados, empresa: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Telefone</Label><Input value={dados.telefone} onChange={e => setDados({ ...dados, telefone: e.target.value })} /></div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" disabled={!!salvando} onClick={() => alterar(dados, "dados", "Dados atualizados.")}>
                    <Spinner k="dados" /> Salvar dados
                  </Button>
                </div>
              </section>

              {/* Acesso */}
              <section className="space-y-3 py-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Acesso e assinatura</h3>
                {sel.stripe_ativo ? (
                  <div className="text-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2">
                    <p className="text-slate-700 dark:text-slate-300">
                      Este cliente paga pelo Stripe ({NOME_PLANO[sel.plan] || sel.plan}
                      {sel.current_period_end ? `, renova em ${fmtDate(sel.current_period_end)}` : ""}).
                      Para trocar de plano, dar desconto ou cancelar, use o painel do Stripe.
                    </p>
                    {sel.stripe_customer_id && (
                      <a href={`https://dashboard.stripe.com/customers/${sel.stripe_customer_id}`} target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1 text-[#075BFF] font-semibold hover:underline">
                        Abrir no Stripe <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1.5">
                        <Label>Estender teste grátis</Label>
                        <div className="flex gap-2">
                          {[7, 15, 30].map(d => (
                            <button key={d} onClick={() => setDias(d)}
                                    className={`h-9 px-3 rounded-lg text-sm border ${dias === d ? "bg-[#075BFF] text-white border-[#075BFF]" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                              +{d} dias
                            </button>
                          ))}
                          <Input type="number" min={1} max={365} value={dias} onChange={e => setDias(parseInt(e.target.value) || 1)} className="w-20 h-9" />
                        </div>
                      </div>
                      <Button size="sm" disabled={!!salvando} className="bg-[#075BFF] hover:bg-blue-600"
                              onClick={() => alterar({ dias_extras_trial: dias }, "estender", `Teste estendido em ${dias} dias.`)}>
                        <Spinner k="estender" /> <Clock className="w-4 h-4 mr-1" /> Estender
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1.5">
                        <Label>Liberar cortesia (sem cobrança)</Label>
                        <div className="flex gap-2">
                          <select value={cortesia.plano} onChange={e => setCortesia({ ...cortesia, plano: e.target.value })}
                                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white">
                            <option value="solo">Solo</option><option value="pro">Profissional</option><option value="equipe">Equipe</option>
                          </select>
                          <Input type="date" value={cortesia.ate} onChange={e => setCortesia({ ...cortesia, ate: e.target.value })} className="h-9 w-40" title="Até (opcional)" />
                        </div>
                        <p className="text-[11px] text-slate-500">Data opcional. Sem data, a cortesia não expira.</p>
                      </div>
                      <Button size="sm" disabled={!!salvando} className="bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => alterar({ cortesia_plano: cortesia.plano, cortesia_ate: cortesia.ate || null }, "cortesia", "Cortesia liberada.")}>
                        <Spinner k="cortesia" /> <Gift className="w-4 h-4 mr-1" /> Liberar
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {categoria(sel) === "cortesia" && (
                        <Button size="sm" variant="outline" disabled={!!salvando}
                                onClick={() => alterar({ remover_cortesia: true }, "remover", "Cortesia removida. A conta ficou em modo consulta.")}>
                          <Spinner k="remover" /> Remover cortesia
                        </Button>
                      )}
                      {categoria(sel) === "teste" && (
                        <Button size="sm" variant="outline" disabled={!!salvando} className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => window.confirm("Encerrar o teste agora? A conta vai para o modo consulta.") &&
                                  alterar({ encerrar_teste: true }, "encerrar", "Teste encerrado. A conta está em modo consulta.")}>
                          <Spinner k="encerrar" /> <Lock className="w-4 h-4 mr-1" /> Encerrar teste agora
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Zona de perigo */}
              <section className="py-4 border-t border-rose-200 dark:border-rose-500/30">
                <h3 className="text-sm font-bold text-rose-600 mb-2">Zona de perigo</h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl p-4">
                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    Exclui a conta e <b>todos</b> os dados da empresa ({sel.uso?.pedidos || 0} pedidos, {sel.uso?.clientes || 0} clientes). Não dá para desfazer.
                    {sel.stripe_ativo && " A assinatura no Stripe será cancelada na hora."}
                  </p>
                  <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white shrink-0" onClick={() => { setConfirmEmail(""); setExcluirOpen(true); }}>
                    <Trash2 className="w-4 h-4 mr-1" /> Excluir conta
                  </Button>
                </div>
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={excluirOpen} onOpenChange={v => { if (!v) setExcluirOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="w-5 h-5" /> Excluir conta definitivamente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-slate-600 dark:text-slate-300">
              Para confirmar, digite o e-mail da conta: <b className="text-slate-900 dark:text-white break-all">{sel?.email}</b>
            </p>
            <Input value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder="e-mail da conta" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluirOpen(false)}>Cancelar</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white"
                    disabled={!!salvando || confirmEmail.trim().toLowerCase() !== (sel?.email || "").toLowerCase()}
                    onClick={excluir}>
              <Spinner k="excluir" /> Excluir tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
