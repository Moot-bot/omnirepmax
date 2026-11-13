import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { fmtBRL } from "../lib/format";
import { CheckCircle2, DollarSign, Pencil, Undo2, Trash2, Unlock, Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Contas a Receber — parcelas de comissão (geradas pelos pedidos) e lançamentos avulsos.
 * Ações: liberar (aguardando liquidez), dar baixa, editar, estornar baixa, excluir (só avulsos), novo lançamento.
 * Os totais são a mesma conta do Dashboard e da tela Comissões.
 */

const n = (v) => Number(v) || 0;
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const soData = (v) => (v ? String(v).slice(0, 10) : "");
const fmtData = (v) => { const m = soData(v).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : "—"; };

const BADGE = {
  aberto: ["Em aberto", "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"],
  vencido: ["Vencido", "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"],
  parcial: ["Parcial", "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"],
  aguardando_liquidez: ["Aguardando liquidez", "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"],
  recebido: ["Recebido", "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"],
  cancelado: ["Cancelado", "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"],
};

function situacao(ar) {
  if (ar.status === "recebido" || ar.status === "cancelado" || ar.status === "aguardando_liquidez") return ar.status;
  if (soData(ar.vencimento) && soData(ar.vencimento) < hojeISO()) return "vencido";
  if (n(ar.valor_recebido) > 0) return "parcial";
  return "aberto";
}

const FILTROS = [
  ["abertos", "Em aberto"], ["vencidos", "Vencidos"], ["liquidez", "Aguardando liquidez"], ["recebidos", "Recebidos"], ["todos", "Todos"],
];

const VAZIO_FORM = { numero_documento: "", cliente_id: "", valor: "", vencimento: hojeISO(), observacoes: "" };

export default function ContasReceber() {
  const [list, setList] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [reps, setReps] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("abertos");
  const [tipo, setTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState(false);

  const [baixa, setBaixa] = useState(null);       // {ar, valor, data}
  const [liberar, setLiberar] = useState(null);   // {ar, data, obs}
  const [edicao, setEdicao] = useState(null);     // {ar|null, form}
  const [confirmacao, setConfirmacao] = useState(null); // {titulo, texto, acao}

  const load = useCallback(async () => {
    try {
      const [arRes, cliRes, repRes] = await Promise.all([api.get("/contas-receber"), api.get("/clientes"), api.get("/representadas")]);
      setList(arRes.data || []); setClientes(cliRes.data || []); setReps(repRes.data || []);
    } catch { toast.error("Erro ao carregar Contas a Receber."); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const nomeCliente = (id) => { const c = clientes.find(x => x.id === id); return c ? (c.nome_fantasia || c.razao_social) : "—"; };
  const nomeRep = (id) => { const r = reps.find(x => x.id === id); return r ? (r.nome_fantasia || r.razao_social) : ""; };
  const erro = (e, padrao) => toast.error(e?.response?.data?.detail || padrao);

  // ---------- totais (mesma conta do Dashboard e da tela Comissões) ----------
  const pendentes = list.filter(a => a.status !== "recebido" && a.status !== "cancelado");
  const deComissao = pendentes.filter(a => a.comissao_id && !a.comissao_orfa);
  const totalComissoes = deComissao.reduce((s, a) => s + n(a.saldo_pendente), 0);
  const totalAguardando = deComissao.filter(a => a.status === "aguardando_liquidez").reduce((s, a) => s + n(a.saldo_pendente), 0);
  const vencidasCom = deComissao.filter(a => situacao(a) === "vencido");
  const totalVencidas = vencidasCom.reduce((s, a) => s + n(a.saldo_pendente), 0);
  const outros = pendentes.filter(a => !a.comissao_id || a.comissao_orfa);
  const totalOutros = outros.reduce((s, a) => s + n(a.saldo_pendente), 0);
  const mes = hojeISO().slice(0, 7);
  const recebidoMes = list.reduce((s, a) => s + (a.historico_recebimentos || [])
    .filter(h => soData(h.data).slice(0, 7) === mes).reduce((x, h) => x + n(h.valor), 0), 0);

  // ---------- lista filtrada ----------
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return list.filter(a => {
      const st = situacao(a);
      if (filtro === "abertos" && !["aberto", "parcial", "vencido"].includes(st)) return false;
      if (filtro === "vencidos" && st !== "vencido") return false;
      if (filtro === "liquidez" && st !== "aguardando_liquidez") return false;
      if (filtro === "recebidos" && st !== "recebido") return false;
      if (tipo === "comissoes" && !(a.comissao_id && !a.comissao_orfa)) return false;
      if (tipo === "outros" && a.comissao_id && !a.comissao_orfa) return false;
      if (q) {
        const alvo = `${a.numero_documento || ""} ${nomeCliente(a.cliente_id)} ${nomeRep(a.representada_id)} ${a.observacoes || ""}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    }).sort((x, y) => soData(x.vencimento).localeCompare(soData(y.vencimento)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, filtro, tipo, busca, clientes, reps]);
  const contagem = (f) => list.filter(a => {
    const st = situacao(a);
    return f === "abertos" ? ["aberto", "parcial", "vencido"].includes(st) : f === "vencidos" ? st === "vencido"
      : f === "liquidez" ? st === "aguardando_liquidez" : f === "recebidos" ? st === "recebido" : true;
  }).length;

  // ---------- ações ----------
  const confirmarBaixa = async () => {
    const v = parseFloat(String(baixa.valor).replace(",", "."));
    if (!(v > 0)) return toast.error("Informe o valor recebido.");
    if (v > n(baixa.ar.saldo_pendente) + 0.01) return toast.error(`O valor passa do saldo (${fmtBRL(baixa.ar.saldo_pendente)}).`);
    setBusy(true);
    try {
      await api.post(`/contas-receber/${baixa.ar.id}/receber`, { valor: v, data: baixa.data });
      toast.success(v >= n(baixa.ar.saldo_pendente) - 0.01 ? "Recebimento registrado — parcela quitada." : "Recebimento parcial registrado.");
      setBaixa(null); load();
    } catch (e) { erro(e, "Erro ao registrar o recebimento."); } finally { setBusy(false); }
  };

  const confirmarLiberacao = async () => {
    setBusy(true);
    try {
      await api.post(`/comissoes/${liberar.ar.comissao_id}/status`, {
        status: "liberada", data: liberar.data, observacao: liberar.obs || "Fábrica recebeu do cliente",
      });
      toast.success("Comissão liberada — as parcelas já podem receber baixa.");
      setLiberar(null); load();
    } catch (e) { erro(e, "Erro ao liberar a comissão."); } finally { setBusy(false); }
  };

  const salvarEdicao = async () => {
    const f = edicao.form;
    const valor = parseFloat(String(f.valor).replace(",", "."));
    if (!(valor > 0)) return toast.error("Informe o valor.");
    if (!f.vencimento) return toast.error("Informe o vencimento.");
    if (edicao.ar && valor < n(edicao.ar.valor_recebido) - 0.01)
      return toast.error(`O valor não pode ficar menor que o já recebido (${fmtBRL(edicao.ar.valor_recebido)}).`);
    setBusy(true);
    try {
      if (edicao.ar) {
        const a = edicao.ar;
        await api.put(`/contas-receber/${a.id}`, {
          cliente_id: f.cliente_id || a.cliente_id || "", representada_id: a.representada_id || "", pedido_id: a.pedido_id || "",
          numero_documento: f.numero_documento, valor, vencimento: f.vencimento,
          data_recebimento: a.data_recebimento || "", status: a.status === "vencido" ? "aberto" : a.status,
          forma_pagamento: a.forma_pagamento || "", observacoes: f.observacoes,
        });
        toast.success("Lançamento atualizado.");
      } else {
        await api.post("/contas-receber", {
          cliente_id: f.cliente_id, numero_documento: f.numero_documento, valor, vencimento: f.vencimento,
          status: "aberto", observacoes: f.observacoes,
        });
        toast.success("Lançamento criado.");
      }
      setEdicao(null); load();
    } catch (e) { erro(e, "Erro ao salvar."); } finally { setBusy(false); }
  };

  const estornar = (ar) => setConfirmacao({
    titulo: "Estornar recebimento",
    texto: `Desfazer o último recebimento desta parcela (${ar.numero_documento || fmtBRL(ar.valor)})? O valor volta a ficar em aberto${ar.comissao_id ? " e a comissão é atualizada" : ""}.`,
    acao: async () => { await api.post(`/contas-receber/${ar.id}/estornar`); toast.success("Recebimento estornado."); },
  });
  const excluir = (ar) => setConfirmacao({
    titulo: "Excluir lançamento",
    texto: `Excluir o lançamento ${ar.numero_documento || ""} de ${fmtBRL(ar.valor)}? Isso não pode ser desfeito.`,
    acao: async () => { await api.delete(`/contas-receber/${ar.id}`); toast.success("Lançamento excluído."); },
  });
  const executarConfirmacao = async () => {
    setBusy(true);
    try { await confirmacao.acao(); setConfirmacao(null); load(); }
    catch (e) { erro(e, "Não foi possível concluir."); } finally { setBusy(false); }
  };

  const abrirEdicao = (ar) => setEdicao({
    ar, form: ar ? { numero_documento: ar.numero_documento || "", cliente_id: ar.cliente_id || "", valor: ar.valor,
                     vencimento: soData(ar.vencimento), observacoes: ar.observacoes || "" } : { ...VAZIO_FORM },
  });

  const inputCls = "bg-white dark:bg-slate-900 text-slate-900 dark:text-white";
  const iconBtn = "h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#075BFF] hover:border-[#075BFF]/40 hover:bg-[#075BFF]/5 transition-colors";

  return (
    <div className="pb-10">
      <PageHeader title="Contas a Receber" subtitle="Parcelas de comissão e outros recebimentos" />

      {/* Cards — mesmo padrão visual da tela Comissões */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 mb-1">Comissões pendentes</div>
          <div className="text-2xl font-bold text-amber-600">{fmtBRL(totalComissoes)}</div>
          {totalAguardando > 0 && <div className="text-[11px] text-slate-500 mt-1">inclui {fmtBRL(totalAguardando)} aguardando liquidez</div>}
        </div>
        <button onClick={() => { setFiltro("vencidos"); setTipo("comissoes"); }}
                className="text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-slate-500 mb-1">Comissões vencidas</div>
          <div className="text-2xl font-bold text-rose-600">{fmtBRL(totalVencidas)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{vencidasCom.length} parcela(s)</div>
        </button>
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 mb-1">Recebido no mês</div>
          <div className="text-2xl font-bold text-emerald-600">{fmtBRL(recebidoMes)}</div>
        </div>
        <button onClick={() => { setFiltro("abertos"); setTipo("outros"); }}
                className="text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-slate-400 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-slate-500 mb-1">Outros a receber</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtBRL(totalOutros)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{outros.length} lançamento(s) sem comissão</div>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map(([id, rot]) => (
            <button key={id} onClick={() => setFiltro(id)}
                    className={`px-3 h-8 rounded-full text-xs font-semibold transition-colors ${filtro === id ? "bg-[#075BFF] text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#075BFF]/40"}`}>
              {rot} <span className="opacity-70">({contagem(id)})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 lg:ml-auto">
          <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2 text-slate-700 dark:text-slate-200">
            <option value="todos">Comissões e outros</option>
            <option value="comissoes">Só comissões</option>
            <option value="outros">Só outros</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Cliente, documento…" className={`${inputCls} pl-8 h-9 w-52`} />
          </div>
          <Button onClick={() => abrirEdicao(null)} className="bg-[#075BFF] h-9"><Plus className="w-4 h-4 mr-1" /> Novo</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr className="text-slate-600 dark:text-slate-300">
                <th className="text-left px-5 py-3 font-semibold">Documento</th>
                <th className="text-left px-5 py-3 font-semibold">Cliente / Representada</th>
                <th className="text-left px-5 py-3 font-semibold">Vencimento</th>
                <th className="text-right px-5 py-3 font-semibold">Valor</th>
                <th className="text-right px-5 py-3 font-semibold">Recebido</th>
                <th className="text-right px-5 py-3 font-semibold">Saldo</th>
                <th className="text-center px-5 py-3 font-semibold">Situação</th>
                <th className="text-right px-5 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((ar) => {
                const st = situacao(ar);
                const [rot, cls] = BADGE[st] || [st, ""];
                const ehComissao = ar.comissao_id && !ar.comissao_orfa;
                return (
                  <tr key={ar.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">{ar.numero_documento || "—"}</div>
                      <div className="text-[10px] text-slate-500">{ehComissao ? "Comissão" : "Avulso"}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{nomeCliente(ar.cliente_id)}</div>
                      {nomeRep(ar.representada_id) && <div className="text-[11px] text-slate-500">{nomeRep(ar.representada_id)}</div>}
                    </td>
                    <td className={`px-5 py-3 ${st === "vencido" ? "text-rose-600 font-semibold" : "text-slate-600 dark:text-slate-400"}`}>{fmtData(ar.vencimento)}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmtBRL(ar.valor)}</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{fmtBRL(ar.valor_recebido)}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-500">{fmtBRL(ar.saldo_pendente)}</td>
                    <td className="px-5 py-3 text-center"><span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${cls}`}>{rot}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {st === "aguardando_liquidez" && ehComissao && (
                          <Button size="sm" onClick={() => setLiberar({ ar, data: hojeISO(), obs: "" })} className="h-8 bg-amber-500 hover:bg-amber-600 text-white">
                            <Unlock className="w-3.5 h-3.5 mr-1" /> Liberar
                          </Button>
                        )}
                        {["aberto", "parcial", "vencido"].includes(st) && (
                          <Button size="sm" onClick={() => setBaixa({ ar, valor: ar.saldo_pendente, data: hojeISO() })} className="h-8 bg-[#075BFF]">
                            <DollarSign className="w-3.5 h-3.5 mr-1" /> Baixar
                          </Button>
                        )}
                        {st === "recebido" && (
                          <span className="h-8 inline-flex items-center px-2 text-xs font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pago</span>
                        )}
                        {st !== "cancelado" && st !== "recebido" && (
                          <button className={iconBtn} title="Editar" onClick={() => abrirEdicao(ar)}><Pencil className="w-3.5 h-3.5" /></button>
                        )}
                        {n(ar.valor_recebido) > 0 && (
                          <button className={iconBtn} title="Estornar último recebimento" onClick={() => estornar(ar)}><Undo2 className="w-3.5 h-3.5" /></button>
                        )}
                        {!ehComissao && n(ar.valor_recebido) === 0 && (
                          <button className={`${iconBtn} hover:!text-rose-600 hover:!border-rose-300`} title="Excluir" onClick={() => excluir(ar)}><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!carregando && visiveis.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-500">Nenhum lançamento neste filtro.</td></tr>
              )}
              {carregando && <tr><td colSpan={8} className="text-center py-10 text-slate-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Baixa */}
      <Dialog open={!!baixa} onOpenChange={(v) => !v && setBaixa(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>
          {baixa && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg flex justify-between">
                <div>
                  <p className="text-xs text-slate-500">{baixa.ar.numero_documento || "Lançamento"} · {nomeCliente(baixa.ar.cliente_id)}</p>
                  <p className="text-xs text-slate-500">Vencimento {fmtData(baixa.ar.vencimento)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Saldo</p>
                  <p className="text-xl font-bold text-amber-600">{fmtBRL(baixa.ar.saldo_pendente)}</p>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Valor recebido</Label>
                <Input type="number" step="0.01" className={inputCls} value={baixa.valor} onChange={e => setBaixa({ ...baixa, valor: e.target.value })} />
                <p className="text-[11px] text-slate-500">Menor que o saldo = recebimento parcial (o restante continua em aberto).</p>
              </div>
              <div className="space-y-1.5"><Label>Data do recebimento</Label>
                <Input type="date" className={inputCls} value={baixa.data} onChange={e => setBaixa({ ...baixa, data: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixa(null)}>Cancelar</Button>
            <Button onClick={confirmarBaixa} disabled={busy} className="bg-[#075BFF]">{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Liberar comissão */}
      <Dialog open={!!liberar} onOpenChange={(v) => !v && setLiberar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Liberar comissão</DialogTitle></DialogHeader>
          {liberar && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Confirme que a <b>fábrica já recebeu do cliente</b>. As parcelas desta comissão passam para “Em aberto” e podem receber baixa.
              </p>
              <div className="space-y-1.5"><Label>Data em que a fábrica recebeu</Label>
                <Input type="date" className={inputCls} value={liberar.data} onChange={e => setLiberar({ ...liberar, data: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Observação (opcional)</Label>
                <Input className={inputCls} value={liberar.obs} onChange={e => setLiberar({ ...liberar, obs: e.target.value })} placeholder="Ex.: confirmado no extrato da fábrica" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiberar(null)}>Cancelar</Button>
            <Button onClick={confirmarLiberacao} disabled={busy} className="bg-amber-500 hover:bg-amber-600 text-white">{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Liberar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar / novo */}
      <Dialog open={!!edicao} onOpenChange={(v) => !v && setEdicao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edicao?.ar ? "Editar lançamento" : "Novo lançamento a receber"}</DialogTitle></DialogHeader>
          {edicao && (
            <div className="space-y-3 py-2">
              {(!edicao.ar || !edicao.ar.comissao_id) && (
                <div className="space-y-1.5"><Label>Cliente</Label>
                  <select value={edicao.form.cliente_id} onChange={e => setEdicao({ ...edicao, form: { ...edicao.form, cliente_id: e.target.value } })}
                          className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white">
                    <option value="">— sem cliente —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5"><Label>Documento</Label>
                <Input className={inputCls} value={edicao.form.numero_documento} onChange={e => setEdicao({ ...edicao, form: { ...edicao.form, numero_documento: e.target.value } })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Valor</Label>
                  <Input type="number" step="0.01" className={inputCls} value={edicao.form.valor} onChange={e => setEdicao({ ...edicao, form: { ...edicao.form, valor: e.target.value } })} />
                </div>
                <div className="space-y-1.5"><Label>Vencimento</Label>
                  <Input type="date" className={inputCls} value={edicao.form.vencimento} onChange={e => setEdicao({ ...edicao, form: { ...edicao.form, vencimento: e.target.value } })} />
                </div>
              </div>
              <div className="space-y-1.5"><Label>Observações</Label>
                <Input className={inputCls} value={edicao.form.observacoes} onChange={e => setEdicao({ ...edicao, form: { ...edicao.form, observacoes: e.target.value } })} />
              </div>
              {edicao.ar?.comissao_id && (
                <p className="text-[11px] text-slate-500">Parcela de comissão: a mudança de valor também atualiza o saldo da comissão.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdicao(null)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={busy} className="bg-[#075BFF]">{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação */}
      <Dialog open={!!confirmacao} onOpenChange={(v) => !v && setConfirmacao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{confirmacao?.titulo}</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300 py-2">{confirmacao?.texto}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmacao(null)}>Cancelar</Button>
            <Button onClick={executarConfirmacao} disabled={busy} className="bg-rose-600 hover:bg-rose-700 text-white">{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
