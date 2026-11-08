import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { brl } from "../../lib/dashboardComercial";

/**
 * Bloco de comparativos para colocar ABAIXO do valor principal de cada card do Dashboard.
 *   <Comparativos dados={dados?.cards?.volume_vendas} />
 *   <Comparativos dados={dados?.cards?.em_atraso} inverso />   // menos atraso = melhor
 */
export default function Comparativos({ dados, inverso = false, variante = "neutro", className = "" }) {
  const chip = variante === "chip";   // cards coloridos (texto branco sobre gradiente)
  if (!dados) {
    return (
      <div className={`mt-3 space-y-1.5 ${className}`}>
        {[0, 1, 2].map(i => <div key={i} className="h-3 rounded bg-current opacity-10 animate-pulse" />)}
      </div>
    );
  }
  const v = dados.variacao_pct;
  const bom = dados.tendencia === "melhora", ruim = dados.tendencia === "piora";
  const Icone = v === null || v === undefined || dados.tendencia === "estavel" ? Minus : (v > 0 ? TrendingUp : TrendingDown);
  const cor = chip
    ? (bom ? "bg-white text-emerald-700" : ruim ? "bg-white text-rose-700" : "bg-white/20 text-white")
    : (bom ? "text-emerald-500" : ruim ? "text-rose-500" : "opacity-60");

  return (
    <div className={`mt-3 pt-3 border-t ${chip ? "border-white/25" : "border-slate-200/60 dark:border-white/10"} ${className}`}>
      {v !== null && v !== undefined && (
        <div className={`inline-flex items-center gap-1 text-[11px] font-bold mb-1.5 ${chip ? "px-2 py-0.5 rounded-full" : ""} ${cor}`}
             title={inverso ? "Comparado ao mês anterior (para atraso, cair é melhor)" : "Comparado ao mês anterior"}>
          <Icone className="w-3.5 h-3.5" />
          {v > 0 ? "+" : ""}{v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs mês anterior
        </div>
      )}
      <dl className="space-y-0.5 text-[11px] sm:text-xs">
        {[["Mês anterior", dados.mes_anterior], ["Ano vigente", dados.ano_vigente], ["Ano anterior", dados.ano_anterior]].map(([rotulo, valor]) => (
          <div key={rotulo} className="flex justify-between gap-2">
            <dt className={chip ? "text-white/75" : "opacity-60"}>{rotulo}</dt>
            <dd className={`font-mono tabular-nums ${chip ? "text-white/90" : "opacity-80"}`}>{brl(valor)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** true quando não houve nenhum lançamento no mês (para o "Nenhum registro" do valor principal). */
export const semRegistrosNoMes = (dados) => !!dados && (dados.qtd_mes ?? 0) === 0 && !dados.valor;
