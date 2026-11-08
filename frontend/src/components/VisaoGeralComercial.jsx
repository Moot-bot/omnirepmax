import React, { useState } from "react";
import { Target, Trophy, Clock, AlertTriangle, Settings2, Filter } from "lucide-react";
import DefinirMetas from "./DefinirMetas";
import { brl, pct } from "../../lib/dashboardComercial";

const BADGE = {
  batida:    { rotulo: "META BATIDA",   cls: "bg-amber-400/20 text-amber-600 dark:text-amber-300 border-amber-400/40", icone: Trophy },
  andamento: { rotulo: "EM ANDAMENTO",  cls: "bg-[#075BFF]/15 text-[#075BFF] dark:text-[#08D5F5] border-[#075BFF]/30", icone: Clock },
  atencao:   { rotulo: "ATENÇÃO",       cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30", icone: AlertTriangle },
};
const BARRA = { batida: "from-amber-400 to-yellow-300", andamento: "from-[#075BFF] to-[#08D5F5]", atencao: "from-orange-500 to-rose-500" };
const selCls = "h-10 px-3 rounded-lg border text-sm bg-white border-slate-200 text-slate-900 dark:bg-[#0A1838] dark:border-[#1E3A8A]/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]";

/**
 * Bloco "VISÃO GERAL COMERCIAL" do Dashboard: filtros (representada + rede) e card da meta do mês.
 * Recebe os dados do useDashboardComercial — a mesma resposta alimenta os 4 cards.
 */
export default function VisaoGeralComercial({ dados, filtros, onFiltros, onMetasSalvas }) {
  const [metasAberto, setMetasAberto] = useState(false);
  const meta = dados?.meta;
  const periodo = dados?.periodo;
  const badge = meta && BADGE[meta.status];
  const BadgeIcone = badge?.icone;
  const temMeta = meta && meta.valor;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 dark:border-[#1E3A8A]/40 bg-white dark:bg-gradient-to-br dark:from-[#0A1838] dark:to-[#060C1A] p-4 sm:p-6 shadow-sm">
      {/* Cabeçalho + filtros */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-wide text-slate-900 dark:text-white">VISÃO GERAL COMERCIAL</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Resumo de pedidos, faturamento e comissões da sua agência.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="sr-only" htmlFor="f-rep">Representada</label>
          <div className="relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
            <select id="f-rep" className={`${selCls} pl-9 min-w-[200px]`} value={filtros.representada_id || ""}
                    onChange={e => onFiltros({ ...filtros, representada_id: e.target.value })}>
              <option value="">Todas as representadas</option>
              {(dados?.filtros?.representadas || []).map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
          <label className="sr-only" htmlFor="f-rede">Rede</label>
          <select id="f-rede" className={`${selCls} min-w-[180px]`} value={filtros.rede || ""}
                  onChange={e => onFiltros({ ...filtros, rede: e.target.value })}>
            <option value="">Todas as redes</option>
            {(dados?.filtros?.redes || []).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Card da meta */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="text-sm font-bold tracking-wider text-slate-700 dark:text-slate-200">{periodo?.rotulo || "…"}</p>
          {badge ? (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider px-2.5 py-1 rounded-full border ${badge.cls}`}>
              <BadgeIcone className="w-3.5 h-3.5" /> {badge.rotulo}
            </span>
          ) : meta?.status === "sem_meta" && (
            <span className="text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-slate-300 dark:border-white/15 text-slate-500">SEM META</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {/* Vendido no mês */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Vendido no mês</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{dados ? brl(meta.vendido_mes) : "…"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hoje: <span className="font-semibold tabular-nums">{dados ? brl(meta.vendido_hoje) : "…"}</span></p>
          </div>

          {/* Objetivo */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Objetivo do mês</p>
              <button onClick={() => setMetasAberto(true)} className="text-xs font-semibold text-[#075BFF] dark:text-[#08D5F5] hover:underline inline-flex items-center gap-1">
                <Settings2 className="w-3.5 h-3.5" /> {dados?.pode_editar_metas ? "Definir metas" : "Ver metas"}
              </button>
            </div>
            {temMeta ? (
              <>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{brl(meta.valor)}</p>
                <div className="mt-2 h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden" role="progressbar"
                     aria-valuenow={meta.percentual} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full bg-gradient-to-r ${BARRA[meta.status] || BARRA.andamento} transition-all duration-700`}
                       style={{ width: `${Math.min(100, meta.percentual)}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{pct(meta.percentual)} realizado</span>
                  {meta.status !== "batida" && <span className="text-slate-500 dark:text-slate-400" title="Proporção de dias úteis já decorridos">esperado {pct(meta.esperado_pct)}</span>}
                </div>
                {meta.origem && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{meta.origem}</p>}
              </>
            ) : (
              <div className="mt-1">
                <button onClick={() => setMetasAberto(true)} disabled={!dados?.pode_editar_metas}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#075BFF] dark:text-[#08D5F5] disabled:opacity-60">
                  <Target className="w-4 h-4" /> Definir meta
                </button>
                {meta?.origem && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{meta.origem}</p>}
              </div>
            )}
          </div>

          {/* Necessário vender */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Necessário vender</p>
            {temMeta ? (
              meta.necessario_por_dia === null ? (
                <>
                  <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">{brl(meta.falta_total)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pendente — não há mais dias úteis no mês.</p>
                </>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {brl(meta.necessario_por_dia)}<span className="text-sm font-semibold text-slate-500"> /dia útil</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {meta.status === "batida" ? "Meta atingida." : meta.ultimo_dia_util ? "Último dia útil do mês." : `${meta.dias_uteis_restantes} dias úteis restantes.`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Equivalente a <span className="font-semibold tabular-nums">{brl(meta.falta_total)}</span> total</p>
                </>
              )
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cadastre uma meta para ver quanto falta por dia útil.</p>
            )}
          </div>
        </div>
      </div>

      {dados && (
        <DefinirMetas open={metasAberto} onOpenChange={setMetasAberto}
                      ano={periodo.ano} mes={periodo.mes}
                      representadas={dados.filtros.representadas} redes={dados.filtros.redes}
                      inicial={filtros} podeEditar={dados.pode_editar_metas}
                      onSalvo={onMetasSalvas} />
      )}
    </section>
  );
}
