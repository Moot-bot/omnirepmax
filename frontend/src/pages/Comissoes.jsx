import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { fmtBRL } from "../lib/format";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Percent, TrendingUp, DollarSign, Clock, Building2, ListChecks, AlertCircle, Unlock, Loader2, History, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import ComissaoDetalhe from "../components/ComissaoDetalhe";
import { toast } from "sonner";

// "2026-12-01" é data local (sem isso o navegador mostra 30/11 por causa do fuso)
const fmtData = (v) => {
  if (!v) return "—";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(v).toLocaleDateString("pt-BR");
};

const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function Comissoes() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCom, setSelectedCom] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [loadingParcelas, setLoadingParcelas] = useState(false);
  // ✅ ações direto no modal (antes só mandava ir para Contas a Receber)
  const [baixa, setBaixa] = useState(null);          // {id, valor, data}
  const [dataLiberacao, setDataLiberacao] = useState(hojeISO());
  const [salvando, setSalvando] = useState(false);
  const [detalheId, setDetalheId] = useState(null);  // status e histórico

  const load = useCallback(async () => {
    try {
      const [comRes, repRes] = await Promise.all([
        api.get("/comissoes"),
        api.get("/representadas")
      ]);
      setList(comRes.data);
      setReps(repRes.data);
    } catch {
      toast.error("Erro ao carregar dados de comissões.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // --- Cálculos do Resumo Global ---
  // ✅ O servidor já devolve saldo e recebido calculados pelas parcelas em Contas a Receber,
  //    então "Saldo a Receber" aqui = "Comissões pendentes" lá. Canceladas não entram em nada.
  const n = (v) => Number(v) || 0;
  const ativas = list.filter(c => c.status !== "cancelada");
  const comissoesPrevistas = ativas.reduce((acc, c) => acc + n(c.valor_liquido), 0);
  const totalAReceber = ativas.reduce((acc, c) => acc + n(c.saldo_pendente), 0);
  const aguardandoLiquidez = ativas.filter(c => c.status === "aguardando_liquidez").reduce((acc, c) => acc + n(c.saldo_pendente), 0);
  const recebido = ativas.reduce((acc, c) => acc + n(c.valor_recebido), 0);
  const hoje = new Date();
  
  void hoje;
  // ✅ Vencidas = parcelas em aberto com vencimento antes de hoje (o servidor calcula; é o mesmo número do card "Em atraso" do Dashboard)
  const vencidas = ativas.filter(c => c.status !== "aguardando_liquidez").reduce((acc, c) => acc + n(c.saldo_vencido), 0);

  // --- Agrupamento por Representada ---
  const resumoPorFabrica = reps.map(rep => {
    const comRep = ativas.filter(c => c.representada_id === rep.id);
    if (comRep.length === 0) return null;
    
    return {
      id: rep.id,
      nome: rep.nome_fantasia || rep.razao_social,
      logo: rep.logo,
      qtdPedidos: comRep.length,
      totalGerado: comRep.reduce((acc, c) => acc + n(c.valor_liquido), 0),
      totalRecebido: comRep.reduce((acc, c) => acc + n(c.valor_recebido), 0),
      saldoPendente: comRep.reduce((acc, c) => acc + n(c.saldo_pendente), 0),
    };
  }).filter(Boolean);

  // --- Função para abrir o Modal de Parcelas ---
  const recarregarModal = async (comissao) => {
    const [resAr, resCom] = await Promise.all([api.get("/contas-receber"), api.get("/comissoes")]);
    setList(resCom.data);
    const atual = resCom.data.find(c => c.id === comissao.id) || comissao;
    setSelectedCom(atual);
    setParcelas(resAr.data.filter(ar => ar.comissao_id === comissao.id).sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento))));
  };

  const darBaixa = async () => {
    const v = parseFloat(String(baixa.valor).replace(",", "."));
    if (!(v > 0)) return toast.error("Informe o valor recebido.");
    setSalvando(true);
    try {
      await api.post(`/contas-receber/${baixa.id}/receber`, { valor: v, data: baixa.data });
      toast.success("Recebimento registrado.");
      setBaixa(null); await recarregarModal(selectedCom);
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao registrar."); } finally { setSalvando(false); }
  };

  const estornar = async (p) => {
    if (!window.confirm("Desfazer o último recebimento desta parcela?")) return;
    try { await api.post(`/contas-receber/${p.id}/estornar`); toast.success("Recebimento estornado."); await recarregarModal(selectedCom); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro ao estornar."); }
  };

  const liberarComissao = async () => {
    setSalvando(true);
    try {
      await api.post(`/comissoes/${selectedCom.id}/status`, { status: "liberada", data: dataLiberacao, observacao: "Fábrica recebeu do cliente" });
      toast.success("Comissão liberada — as parcelas já podem receber baixa.");
      await recarregarModal(selectedCom);
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao liberar."); } finally { setSalvando(false); }
  };

  const verParcelas = async (comissao) => {
    setSelectedCom(comissao);
    setBaixa(null); setDataLiberacao(hojeISO());
    setModalOpen(true);
    setLoadingParcelas(true);
    try {
      const res = await api.get("/contas-receber");
      const parcelasFiltradas = res.data.filter(ar => ar.comissao_id === comissao.id);
      parcelasFiltradas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
      setParcelas(parcelasFiltradas);
    } catch {
      toast.error("Erro ao carregar as parcelas.");
    } finally {
      setLoadingParcelas(false);
    }
  };

  const getRepName = (id) => {
    const rep = reps.find(r => r.id === id);
    return rep ? (rep.nome_fantasia || rep.razao_social) : "Fábrica";
  };

  return (
    <div className="pb-10">
      <PageHeader title="Gestão de Comissões" subtitle="Acompanhe o valor gerado por fábrica e veja o detalhamento por pedido" />

      {/* 1. Cards de Resumo Global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 border-l-4 border-l-blue-500 shadow-sm bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1"><Percent className="w-4 h-4" /> Comissões Geradas</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtBRL(comissoesPrevistas)}</div>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-amber-500 shadow-sm bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1"><Clock className="w-4 h-4" /> Saldo a Receber</div>
          <div className="text-2xl font-bold text-amber-600">{fmtBRL(totalAReceber)}</div>
          {aguardandoLiquidez > 0 && (
            <div className="text-[11px] text-slate-500 mt-1">inclui {fmtBRL(aguardandoLiquidez)} aguardando liquidez</div>
          )}
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-500 shadow-sm bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1"><TrendingUp className="w-4 h-4" /> Já Recebido</div>
          <div className="text-2xl font-bold text-emerald-600">{fmtBRL(recebido)}</div>
        </Card>

        <Card className="p-5 border-l-4 border-l-rose-500 shadow-sm bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1"><DollarSign className="w-4 h-4" /> Comissões Vencidas</div>
          <div className="text-2xl font-bold text-rose-600">{fmtBRL(vencidas)}</div>
        </Card>
      </div>

      {/* 2. Resumo por Fábrica */}
      {resumoPorFabrica.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Building2 className="w-4 h-4 text-[#075BFF]" /> Acumulado por Representada
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumoPorFabrica.map(r => (
              <div key={r.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  {r.logo ? <img src={r.logo} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-slate-50 p-1" /> : <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Building2 className="w-5 h-5" /></div>}
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{r.nome}</h4>
                    <p className="text-xs text-slate-500">{r.qtdPedidos} pedidos</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Comissão Total:</span> <span className="font-mono">{fmtBRL(r.totalGerado)}</span></div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Já Recebido:</span> <span className="font-mono">{fmtBRL(r.totalRecebido)}</span></div>
                  <div className="flex justify-between text-amber-600 font-bold border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5"><span>A Receber:</span> <span className="font-mono">{fmtBRL(r.saldoPendente)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Tabela Detalhada */}
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
        <ListChecks className="w-4 h-4 text-[#075BFF]" /> Detalhamento dos Pedidos
      </h3>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4 text-left text-slate-600 dark:text-slate-300">Pedido / NF</th>
                <th className="px-5 py-4 text-left text-slate-600 dark:text-slate-300">Representada</th>
                <th className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">Valor Faturado</th>
                <th className="px-5 py-4 text-center text-slate-600 dark:text-slate-300">%</th>
                <th className="px-5 py-4 text-right text-emerald-600">Comissão Líquida</th>
                <th className="px-5 py-4 text-right text-amber-600">Saldo Pendente</th>
                <th className="px-5 py-4 text-center text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{c.pedido_numero}</div>
                    <div className="text-[10px] text-slate-500">{c.nf_numero ? `NF: ${c.nf_numero}` : "Sem NF"}</div>
                  </td>
                  <td className="px-5 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">{getRepName(c.representada_id)}</td>
                  
                  {/* Alterado para mostrar o valor faturado e, se diferente, o valor do pedido */}
                  <td className="px-5 py-3 text-right font-mono text-slate-500">
                    {fmtBRL(c.valor_faturado || c.valor_total_pedido)}
                    {c.valor_faturado && c.valor_faturado !== c.valor_total_pedido && (
                      <div className="text-[10px] text-slate-400">Pedido: {fmtBRL(c.valor_total_pedido)}</div>
                    )}
                  </td>
                  
                  <td className="px-5 py-3 text-center text-slate-500 font-medium">{c.percentual}%</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600">{fmtBRL(c.valor_liquido)}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-amber-600">{fmtBRL(c.status === "cancelada" ? 0 : c.saldo_pendente)}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => verParcelas(c)} className="h-8 border-[#075BFF] text-[#075BFF] hover:bg-[#075BFF]/10">
                      Ver Parcelas
                    </Button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && !loading && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-500">Nenhuma comissão gerada até o momento.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal de Parcelas */}
      <Dialog open={modalOpen} onOpenChange={(v) => { setModalOpen(v); if (!v) load(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Parcelas do Pedido {selectedCom?.pedido_numero}</DialogTitle></DialogHeader>
          
          <div className="py-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500">Comissão Total</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{fmtBRL(selectedCom?.valor_liquido || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Saldo Pendente</p>
                <p className="text-xl font-bold text-amber-600">{fmtBRL(selectedCom?.saldo_pendente || 0)}</p>
              </div>
            </div>

            <h4 className="text-sm font-semibold mb-2">Parcelas</h4>
            {loadingParcelas ? (
              <p className="text-sm text-slate-500 text-center py-4">Carregando...</p>
            ) : (
              <div className="space-y-2">
                {selectedCom?.status === "aguardando_liquidez" && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <b>Aguardando liquidez:</b> a comissão só pode receber baixa depois que a fábrica receber do cliente.
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <label className="text-xs text-amber-800 dark:text-amber-200">
                        Data em que a fábrica recebeu
                        <input type="date" value={dataLiberacao} onChange={e => setDataLiberacao(e.target.value)}
                               className="block mt-1 h-8 rounded-md border border-amber-300 bg-white dark:bg-slate-900 px-2 text-sm text-slate-900 dark:text-white" />
                      </label>
                      <Button size="sm" onClick={liberarComissao} disabled={salvando} className="h-8 bg-amber-500 hover:bg-amber-600 text-white">
                        {salvando ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Unlock className="w-3.5 h-3.5 mr-1" />} Fábrica recebeu — liberar
                      </Button>
                    </div>
                  </div>
                )}
                {parcelas.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Nenhuma parcela encontrada no Contas a Receber.</p>}
                {parcelas.map((p, i) => {
                  const podeBaixar = p.status === "aberto" || p.status === "vencido";
                  return (
                    <div key={p.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                      <div className="flex justify-between items-center gap-3">
                        <div>
                          <p className="text-sm font-semibold">Parcela {i + 1}</p>
                          <p className="text-xs text-slate-500">Vencimento: {fmtData(p.vencimento)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{fmtBRL(p.valor)}</p>
                          {n(p.valor_recebido) > 0 && p.status !== "recebido" && (
                            <p className="text-[11px] text-emerald-600">recebido {fmtBRL(p.valor_recebido)} · falta {fmtBRL(p.saldo_pendente)}</p>
                          )}
                          <div className="mt-1"><StatusBadge status={p.status === "recebido" ? "pago" : p.status} /></div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end gap-2">
                        {n(p.valor_recebido) > 0 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => estornar(p)}><Undo2 className="w-3 h-3 mr-1" />Estornar</Button>
                        )}
                        {podeBaixar && baixa?.id !== p.id && (
                          <Button size="sm" className="h-7 text-xs bg-[#075BFF]" onClick={() => setBaixa({ id: p.id, valor: p.saldo_pendente, data: hojeISO() })}>
                            <DollarSign className="w-3 h-3 mr-1" />Dar baixa
                          </Button>
                        )}
                      </div>
                      {baixa?.id === p.id && (
                        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                          <label className="text-xs text-slate-500">Valor recebido
                            <input type="number" step="0.01" value={baixa.valor} onChange={e => setBaixa({ ...baixa, valor: e.target.value })}
                                   className="block mt-1 h-8 w-32 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm text-slate-900 dark:text-white" />
                          </label>
                          <label className="text-xs text-slate-500">Data
                            <input type="date" value={baixa.data} onChange={e => setBaixa({ ...baixa, data: e.target.value })}
                                   className="block mt-1 h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm text-slate-900 dark:text-white" />
                          </label>
                          <Button size="sm" className="h-8 bg-[#075BFF]" disabled={salvando} onClick={darBaixa}>
                            {salvando && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}Confirmar
                          </Button>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => setBaixa(null)}>Cancelar</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button className="inline-flex items-center gap-1 font-semibold text-[#075BFF] hover:underline"
                      onClick={() => { setDetalheId(selectedCom?.id); setModalOpen(false); }}>
                <History className="w-3.5 h-3.5" /> Status e histórico
              </button>
              <Link to="/contas-receber" className="text-slate-500 hover:text-[#075BFF] underline">Abrir Contas a Receber</Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status manual + histórico */}
      <ComissaoDetalhe comissaoId={detalheId} open={!!detalheId} onOpenChange={v => !v && setDetalheId(null)} onChanged={load} />
    </div>
  );
}