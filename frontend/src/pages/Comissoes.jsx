import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { fmtBRL, fmtDate } from "../lib/format";
import { Card } from "../components/ui/card";
import { Percent, TrendingUp } from "lucide-react";

export default function Comissoes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api.get("/comissoes");
    setList(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const previstas = list.filter(c => c.status === "prevista" || c.status === "faturada").reduce((acc, c) => acc + c.valor, 0);
  const pagas = list.filter(c => c.status === "paga").reduce((acc, c) => acc + c.valor, 0);

  return (
    <div className="pb-10">
      <PageHeader title="Gestão de Comissões" subtitle="Acompanhe as comissões geradas por cada pedido faturado" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="p-5 border-l-4 border-l-amber-500 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-1"><TrendingUp className="w-4 h-4" /> Comissões a Receber</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtBRL(previstas)}</div>
          <p className="text-xs text-slate-400 mt-1">Valores aguardando pagamento (veja em Contas a Receber).</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-1"><Percent className="w-4 h-4" /> Comissões Recebidas</div>
          <div className="text-2xl font-bold text-emerald-600">{fmtBRL(pagas)}</div>
          <p className="text-xs text-slate-400 mt-1">Total já liquidado.</p>
        </Card>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/80 border-b">
            <tr>
              <th className="px-5 py-4 text-left">Pedido</th>
              <th className="px-5 py-4 text-right">Valor Faturado</th>
              <th className="px-5 py-4 text-center">Comissão (%)</th>
              <th className="px-5 py-4 text-right text-emerald-600">Valor Comissão</th>
              <th className="px-5 py-4 text-center">Previsão</th>
              <th className="px-5 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-mono font-semibold">{c.pedido_numero}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-500">{fmtBRL(c.valor_faturado)}</td>
                <td className="px-5 py-3 text-center text-slate-500">{c.percentual}%</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600">{fmtBRL(c.valor)}</td>
                <td className="px-5 py-3 text-center">{fmtDate(c.data_prevista)}</td>
                <td className="px-5 py-3 text-center"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
            {list.length === 0 && !loading && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Nenhuma comissão gerada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}