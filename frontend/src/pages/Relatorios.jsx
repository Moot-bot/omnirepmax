import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Card } from "../components/ui/card";
import { fmtBRL } from "../lib/format";
import { BarChart3, TrendingUp, Building2, Users } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Relatorios() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch {
      // erro
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <div className="p-10 text-center">Carregando relatórios...</div>;

  return (
    <div className="pb-10">
      <PageHeader title="Relatório de Vendas" subtitle="Acompanhamento do volume de vendas e desempenho comercial" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0 shadow-lg">
          <div className="flex items-center gap-2 text-blue-100 mb-2"><BarChart3 className="w-5 h-5" /> Volume Total Vendido (Mês)</div>
          <div className="text-4xl font-bold">{fmtBRL(data.faturamento_mes)}</div>
          <div className="text-sm text-blue-200 mt-2">No ano: {fmtBRL(data.faturamento_ano)}</div>
        </Card>
        
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mb-4"><TrendingUp className="w-5 h-5 text-emerald-500" /> Comissões Previstas (Mês)</div>
          <div className="text-3xl font-bold text-emerald-600">{fmtBRL(data.projecao_comissao)}</div>
          <p className="text-xs text-slate-500 mt-2">Baseado nos pedidos em carteira e faturados.</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="font-semibold mb-4">Vendas por Representada</div>
          <div className="space-y-3">
            {data.faturamento_por_representada.map((rep, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /> {rep.nome}</span>
                <span className="font-bold font-mono">{fmtBRL(rep.valor)}</span>
              </div>
            ))}
            {data.faturamento_por_representada.length === 0 && <div className="text-sm text-slate-500">Sem dados.</div>}
          </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#075BFF]"/> Evolução de Vendas (6 meses)</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.serie_faturamento}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
              <Tooltip formatter={(v) => fmtBRL(v)} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="valor" fill="#075BFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}