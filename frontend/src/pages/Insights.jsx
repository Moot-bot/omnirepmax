import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export default function Insights() {
  const [regras, setRegras] = useState([]);
  const [ai, setAi] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { api.get("/insights/regras").then((r) => setRegras(r.data)); }, []);
  const gerarAI = async () => { setLoading(true); try { const { data } = await api.post("/insights/ai"); if (data.erro) toast.error(data.erro); setAi(data.insights || []); } finally { setLoading(false); } };
  const icon = (tipo) => tipo === "alerta" ? AlertTriangle : tipo === "oportunidade" ? TrendingUp : Lightbulb;
  const color = (tipo) => tipo === "alerta" ? "text-amber-500 bg-amber-500/10 border-amber-500/30" : tipo === "oportunidade" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" : "text-blue-500 bg-blue-500/10 border-blue-500/30";

  return (
    <div>
      <PageHeader title="Insights Comerciais" subtitle="Análises automáticas + IA para orientar sua próxima ação" actions={
        <Button data-testid="btn-generate-ai" onClick={gerarAI} disabled={loading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"><Sparkles className="w-4 h-4 mr-1" />{loading ? "Analisando..." : "Gerar insights IA"}</Button>
      } />
      {ai.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" />Insights gerados por IA</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {ai.map((i, idx) => { const Icon = icon(i.tipo); return (
              <div key={idx} className={`p-4 rounded-xl border ${color(i.tipo)}`}>
                <div className="flex items-start gap-3"><Icon className="w-5 h-5 mt-0.5 shrink-0" />
                  <div><div className="font-semibold">{i.titulo}</div><div className="text-sm mt-1 opacity-90">{i.descricao}</div></div>
                </div>
              </div>
            );})}
          </div>
        </div>
      )}
      <div className="text-sm font-semibold mb-3">Análises automáticas (regras)</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {regras.map((i, idx) => { const Icon = icon(i.tipo); return (
          <div key={idx} className={`p-4 rounded-xl border ${color(i.tipo)}`}>
            <div className="flex items-start gap-3"><Icon className="w-5 h-5 mt-0.5 shrink-0" />
              <div><div className="font-semibold">{i.titulo}</div><div className="text-sm mt-1 opacity-90">{i.descricao}</div></div>
            </div>
          </div>
        );})}
        {regras.length === 0 && <div className="col-span-full text-center text-slate-500 py-8">Nenhum insight ativo.</div>}
      </div>
    </div>
  );
}
