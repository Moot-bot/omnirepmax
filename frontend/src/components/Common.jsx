import React from "react";
import { cn } from "../lib/utils";
export function KpiCard({ label, value, hint, icon: Icon, accent = "royal", testId }) {
  const map = {
    royal: { bg: "bg-[#075BFF]/10 dark:bg-[#075BFF]/15", text: "text-[#075BFF] dark:text-[#60A5FA]", ring: "ring-[#075BFF]/20" },
    cyan: { bg: "bg-[#08D5F5]/10 dark:bg-[#08D5F5]/15", text: "text-[#0891B2] dark:text-[#22D3EE]", ring: "ring-[#08D5F5]/20" },
    blue: { bg: "bg-[#075BFF]/10 dark:bg-[#075BFF]/15", text: "text-[#075BFF] dark:text-[#60A5FA]", ring: "ring-[#075BFF]/20" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
    amber: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20" },
    rose: { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500/20" },
    indigo: { bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-500/20" },
  };
  const c = map[accent] || map.royal;
  return (
    <div data-testid={testId} className={cn("relative p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200")}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</div>
          <div className="font-display text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight text-slate-900 dark:text-white">{value}</div>
          {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
        </div>
        {Icon && <div className={cn("p-2.5 rounded-xl", c.bg, c.text)}><Icon className="w-5 h-5" /></div>}
      </div>
    </div>
  );
}
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
export function StatusBadge({ status }) {
  const colors = {
    ativo: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    prospect: "bg-[#075BFF]/10 text-[#075BFF] dark:text-[#60A5FA] border-[#075BFF]/30",
    inativo: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
    rascunho: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
    enviado: "bg-[#075BFF]/10 text-[#075BFF] dark:text-[#60A5FA] border-[#075BFF]/30",
    aprovado: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    faturado: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    cancelado: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    aberto: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    pago: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    recebido: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    vencido: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    prevista: "bg-[#075BFF]/10 text-[#075BFF] dark:text-[#60A5FA] border-[#075BFF]/30",
    faturada: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    paga: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    agendada: "bg-[#075BFF]/10 text-[#075BFF] dark:text-[#60A5FA] border-[#075BFF]/30",
    realizada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  };
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize", colors[status] || "bg-slate-500/10 text-slate-600 border-slate-500/30")}>{status}</span>;
}
