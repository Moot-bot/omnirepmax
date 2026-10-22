import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge, KpiCard } from "../components/Common";
import { fmtBRL, fmtDate } from "../lib/format";
import { Button } from "../components/ui/button";
import { Percent, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Comissoes() {
  const [list, setList] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [reps, setReps] = useState([]);
  const load = async () => setList((await api.get("/comissoes")).data);
  useEffect(() => { load(); api.get("/clientes").then((r) => setClientes(r.data)); api.get("/representadas").then((r) => setReps(r.data)); }, []);
  const clienteName = (id) => clientes.find((c) => c.id === id)?.nome_fantasia || "-";
  const repName = (id) => reps.find((r) => r.id === id)?.nome_fantasia || "-";
  const totals = list.reduce((a, c) => { a.total += c.valor; if (c.status === "paga") a.paga += c.valor; else a.aberto += c.valor; return a; }, { total: 0, paga: 0, aberto: 0 });
  const marcarPaga = async (id) => { await api.patch(`/comissoes/${id}`, { status: "paga", data_pagamento: new Date().toISOString() }); toast.success("Registrado"); load(); };
  const del = async (c) => {
    if (c.status === "paga") { toast.error("Comissões já pagas não podem ser excluídas"); return; }
    if (!window.confirm(`Excluir a comissão do pedido ${c.pedido_numero}?`)) return;
    try { await api.delete(`/comissoes/${c.id}`); toast.success("Comissão excluída"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Erro ao excluir"); }
  };

  return (
    <div>
      <PageHeader title="Comissões" subtitle="Controle previsto x recebido por representada e pedido" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total previsto" value={fmtBRL(totals.total)} icon={Percent} accent="blue" />
        <KpiCard label="Comissões pagas" value={fmtBRL(totals.paga)} icon={Percent} accent="emerald" />
        <KpiCard label="A receber" value={fmtBRL(totals.aberto)} icon={Percent} accent="amber" />
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="text-left px-4 py-3">Pedido</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Representada</th>
              <th className="text-right px-4 py-3">Faturado</th>
              <th className="text-right px-4 py-3">%</th>
              <th className="text-right px-4 py-3">Comissão</th>
              <th className="text-left px-4 py-3">Previsto</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-mono text-xs">{c.pedido_numero}</td>
                <td className="px-4 py-3">{clienteName(c.cliente_id)}</td>
                <td className="px-4 py-3">{repName(c.representada_id)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtBRL(c.valor_faturado)}</td>
                <td className="px-4 py-3 text-right font-mono">{c.percentual}%</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmtBRL(c.valor)}</td>
                <td className="px-4 py-3 text-xs">{fmtDate(c.data_prevista)}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    {c.status !== "paga" && <Button size="sm" variant="outline" onClick={() => marcarPaga(c.id)} data-testid={`btn-pagar-${c.id}`}><Check className="w-3.5 h-3.5" />Pagar</Button>}
                    {c.status !== "paga" && <Button data-testid={`btn-del-comissao-${c.id}`} size="sm" variant="ghost" onClick={() => del(c)} title="Excluir" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>}
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-500">Sem comissões. Fature pedidos para gerar.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
