import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Clock, FileCheck, RefreshCw } from "lucide-react";
import { fmtBRL, fmtDate } from "../lib/format";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AguardandoFaturamento() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repFilter, setRepFilter] = useState("");
  const [diasMin, setDiasMin] = useState(0);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (repFilter) params.append("representada_id", repFilter);
      params.append("dias_min", diasMin);
      const [pRes, rRes] = await Promise.all([
        api.get(`/pedidos/aguardando-faturamento?${params.toString()}`),
        api.get("/representadas"),
      ]);
      setList(pRes.data);
      setReps(rRes.data);
    } catch { toast.error("Erro ao carregar pedidos pendentes"); }
    finally { setLoading(false); }
  }, [repFilter, diasMin]);

  useEffect(() => { load(); }, [load]);

  const totalSaldo = list.reduce((s, p) => s + (p.saldo_a_faturar || 0), 0);
  const emAlerta = list.filter(p => p.alerta).length;

  return (
    <div className="pb-10">
      <PageHeader
        title="Aguardando Faturamento"
        subtitle="Pedidos com saldo a faturar pela representada"
        actions={<Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Atualizar</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-[#075BFF] text-white shadow-lg">
          <div className="text-xs uppercase font-semibold opacity-90">Total pendente</div>
          <div className="text-2xl font-bold mt-1">{fmtBRL(totalSaldo)}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs uppercase font-semibold text-slate-500">Pedidos pendentes</div>
          <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{list.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30">
          <div className="text-xs uppercase font-semibold text-rose-700 dark:text-rose-300">Parados há +15 dias</div>
          <div className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-400">{emAlerta}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 block mb-1">Representada</label>
          <Select value={repFilter || "all"} onValueChange={v => setRepFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {reps.map(r => <SelectItem key={r.id} value={r.id}>{r.nome_fantasia || r.razao_social}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <label className="text-xs font-semibold text-slate-500 block mb-1">Dias mínimos parado</label>
          <Input type="number" min={0} value={diasMin} onChange={e => setDiasMin(parseInt(e.target.value) || 0)} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Pedido</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Data</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Total</th>
              <th className="px-4 py-3 text-right font-semibold text-amber-600">A faturar</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Dias parado</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Carregando...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Nenhum pedido pendente com esse filtro.</td></tr>
            ) : list.map(p => (
              <tr key={p.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 ${p.alerta ? "bg-rose-50/30 dark:bg-rose-500/5" : ""}`}>
                <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{p.numero}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{fmtDate(p.data_pedido)}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmtBRL(p.total)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">{fmtBRL(p.saldo_a_faturar)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${p.alerta ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                    <Clock className="w-3 h-3" /> {p.dias_aguardando}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button size="sm" onClick={() => navigate("/pedidos")} className="bg-emerald-600 hover:bg-emerald-700 h-8">
                    <FileCheck className="w-3.5 h-3.5 mr-1" /> Faturar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}