import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { fmtBRL, fmtNum } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { 
  TrendingUp, Wallet, AlertCircle, Sparkles, BarChart3, 
  PieChart as PieIcon, Target, ArrowUpRight, ArrowDownRight, 
  Users, ShoppingCart, Percent, FileText,
  Building2, Package, Calendar, CheckCircle2
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar
} from "recharts";

const CAT_COLORS = ["#075BFF", "#08D5F5", "#F59E0B", "#8B5CF6", "#10B981", "#EC4899", "#06B6D4", "#F43F5E"];

const MESES = {
  January: "Janeiro", February: "Fevereiro", March: "Março", April: "Abril",
  May: "Maio", June: "Junho", July: "Julho", August: "Agosto",
  September: "Setembro", October: "Outubro", November: "Novembro", December: "Dezembro",
  Jan: "Jan", Feb: "Fev", Mar: "Mar", Apr: "Abr", May: "Mai", Jun: "Jun",
  Jul: "Jul", Aug: "Ago", Sep: "Set", Oct: "Out", Nov: "Nov", Dec: "Dez"
};
const traduzirTexto = (txt) => {
  if (!txt) return txt;
  return Object.keys(MESES).reduce((acc, en) => acc.replace(new RegExp(`\\b${en}\\b`, 'g'), MESES[en]), txt);
};

const tooltipStyle = {
  backgroundColor: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#f8fafc",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
  fontSize: "12px"
};

function Chip({ label, value, color = "emerald", icon: Icon, isZero, subtitle, badge, onClick }) {
  const bg = { 
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/20", 
    rose: "from-rose-500 to-rose-600 shadow-rose-500/20", 
    teal: "from-teal-500 to-teal-600 shadow-teal-500/20", 
    amber: "from-amber-500 to-amber-600 shadow-amber-500/20",
    blue: "from-[#075BFF] to-blue-600 shadow-blue-500/20"
  }[color];
  
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${bg} text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-500" />
      <div className="relative flex items-center justify-between">
        <Icon className="w-5 h-5 opacity-90 group-hover:opacity-100 transition-opacity" />
        {badge && (
          <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="relative text-xs font-semibold uppercase tracking-wider opacity-90 mt-3">{label}</div>
      <div className="relative font-display text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
        {value}
      </div>
      {subtitle && (
        <div className="relative text-[10px] text-white/75 mt-1 font-medium">{subtitle}</div>
      )}
      {isZero && <div className="text-[10px] text-white/70 mt-1">Nenhum registro</div>}
    </div>
  );
}

function Gauge({ score, label }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#075BFF" : score >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90 drop-shadow-sm">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" className="dark:stroke-slate-800" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-3xl font-extrabold" style={{ color }}>{score}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">/100</div>
        </div>
      </div>
      <div>
        <div className="font-display text-xl font-extrabold" style={{ color }}>{label}</div>
        <div className="text-xs text-slate-500 mt-1 max-w-[180px] leading-snug">Equilíbrio entre faturamento, despesas e inadimplência deste mês.</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => { 
    api.get("/dashboard").then((r) => setD(r.data)); 
  }, []);

  if (!d) return <div className="flex items-center justify-center h-full text-slate-500 animate-pulse">Carregando dashboard...</div>;

  const greet = (() => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; })();
  const firstName = (user?.name || "Usuário").split(" ")[0];
  
  const mes = traduzirTexto(d.mes_atual);

  const fatPorRep = (d.faturamento_por_representada || []).map(r => ({
    nome: r.nome,
    volume: r.volume ?? r.valor ?? 0,
    faturado: r.faturado ?? 0
  }));

  const topProdutos = d.top_produtos || [];
  const emAtrasoCount = d.em_atraso_count || 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Hero / Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          {user?.logo ? (
            <img src={user.logo} alt="logo" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white dark:ring-slate-800 shadow" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-brand-cta flex items-center justify-center text-white font-display font-extrabold text-xl shadow-md shadow-[#075BFF]/30">
              {firstName.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              {greet}, {firstName}! <span className="animate-wave">👋</span>
            </h1>
            <div className="text-sm font-medium text-slate-500 mt-0.5">{mes}</div>
          </div>
        </div>
      </div>

      {/* Avisos inteligentes */}
      {d.avisos?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-500" />Avisos inteligentes
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {d.avisos.map((a, i) => (
              <div
                key={i}
                onClick={() => navigate(a.tipo === "comissao" ? "/comissoes" : "/contas-receber")}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 transition-colors hover:bg-rose-100/50 dark:hover:bg-rose-500/20 cursor-pointer"
              >
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400" />
                <div className="flex-1 text-sm font-medium leading-tight">{traduzirTexto(a.titulo)}</div>
                <div className="text-xs font-mono font-bold whitespace-nowrap bg-white/50 dark:bg-black/20 px-2 py-1 rounded-md">{fmtBRL(a.valor)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 chips coloridas — agora clicáveis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Chip 
          label="Volume de Vendas (Mês)" 
          value={fmtBRL(d.volume_vendas_mes)} 
          color="blue" 
          icon={TrendingUp} 
          isZero={d.volume_vendas_mes === 0}
          subtitle={d.volume_vendas_ano ? `Ano: ${fmtBRL(d.volume_vendas_ano)}` : undefined}
          onClick={() => navigate("/pedidos")}
        />
        <Chip 
          label="Faturamento Real (Mês)" 
          value={fmtBRL(d.valor_faturado_mes)} 
          color="emerald" 
          icon={FileText} 
          isZero={d.valor_faturado_mes === 0}
          subtitle={d.valor_faturado_ano ? `Ano: ${fmtBRL(d.valor_faturado_ano)}` : undefined}
          onClick={() => navigate("/pedidos")}
        />
        <Chip 
          label="Comissões Previstas" 
          value={fmtBRL(d.comissoes_previstas)} 
          color="teal" 
          icon={Percent} 
          isZero={d.comissoes_previstas === 0}
          subtitle={d.comissoes_recebidas ? `Recebido: ${fmtBRL(d.comissoes_recebidas)}` : undefined}
          onClick={() => navigate("/comissoes")}
        />
        <Chip 
          label="Em atraso" 
          value={fmtBRL(d.em_atraso)} 
          color="rose" 
          icon={AlertCircle} 
          isZero={d.em_atraso === 0}
          badge={emAtrasoCount > 0 ? `${emAtrasoCount} título${emAtrasoCount > 1 ? 's' : ''}` : undefined}
          onClick={() => navigate("/contas-receber")}
        />
      </div>

      {/* Saúde + Projeção */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold mb-5"><Target className="w-4 h-4 text-[#075BFF]" />Saúde Financeira</div>
          <Gauge score={d.saude_financeira} label={d.saude_label} />
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold mb-5"><BarChart3 className="w-4 h-4 text-[#08D5F5]" />Projeção do mês</div>
          <div className="space-y-3">
            <Row label="Pedidos em carteira (não faturados)" value={fmtBRL(d.projecao_valor)} good onClick={() => navigate("/pedidos")} />
            <Row label="Comissão projetada" value={fmtBRL(d.projecao_comissao)} good onClick={() => navigate("/comissoes")} />
            <Row label="A receber (abertas)" value={fmtBRL(d.contas_receber_abertas)} onClick={() => navigate("/contas-receber")} />
            <Row label="A pagar (abertas)" value={fmtBRL(d.contas_pagar_abertas)} bad onClick={() => navigate("/contas-pagar")} />
          </div>
        </div>
      </div>

      {/* Resumo do mês + Gastos por categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
          <div className="text-sm font-semibold mb-4">Resumo do mês</div>
          <div className="space-y-1">
            <ResumoRow icon={<ShoppingCart className="w-4 h-4 text-blue-500" />} label="Volume de Vendas" value={fmtBRL(d.volume_vendas_mes)} valueClass="text-slate-900 dark:text-white" onClick={() => navigate("/pedidos")} />
            <ResumoRow icon={<FileText className="w-4 h-4 text-emerald-500" />} label="Faturamento Real (NFs)" value={fmtBRL(d.valor_faturado_mes)} valueClass="text-emerald-600 dark:text-emerald-400" onClick={() => navigate("/pedidos")} />
            <ResumoRow icon={<ArrowDownRight className="w-4 h-4 text-rose-500" />} label="Saídas (Despesas)" value={fmtBRL(d.despesas_mes)} valueClass="text-rose-600 dark:text-rose-400" onClick={() => navigate("/contas-pagar")} />
            <ResumoRow icon={<Wallet className="w-4 h-4 text-blue-500" />} label="Diferença (Saldo)" value={fmtBRL(d.saldo_mes)} valueClass={d.saldo_mes >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
            <ResumoRow icon={<Users className="w-4 h-4 text-indigo-500" />} label="Clientes ativos / Novos" value={`${fmtNum(d.clientes_ativos)} / ${fmtNum(d.novos_clientes)}`} onClick={() => navigate("/clientes")} />
            <ResumoRow icon={<ShoppingCart className="w-4 h-4 text-amber-500" />} label="Pedidos abertos / Faturados" value={`${fmtNum(d.pedidos_abertos)} / ${fmtNum(d.pedidos_faturados)}`} onClick={() => navigate("/pedidos")} />
            <ResumoRow icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Comissão recebida" value={fmtBRL(d.comissoes_recebidas)} valueClass="text-emerald-600 dark:text-emerald-400" onClick={() => navigate("/contas-receber")} />
            <ResumoRow icon={<Percent className="w-4 h-4 text-emerald-500" />} label="Comissão a receber" value={fmtBRL(d.comissoes_abertas)} valueClass="text-emerald-600 dark:text-emerald-400" onClick={() => navigate("/contas-receber")} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold mb-4"><PieIcon className="w-4 h-4 text-[#075BFF]" />Gastos por categoria</div>
          {!d.gastos_por_categoria?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <PieIcon className="w-10 h-10 mb-2 opacity-20" />
              <span className="text-sm">Sem despesas cadastradas.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={d.gastos_por_categoria} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} stroke="none">
                    {d.gastos_por_categoria.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={tooltipStyle} itemStyle={{ color: "#f8fafc" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {d.gastos_por_categoria.map((g, i) => (
                  <div
                    key={g.categoria}
                    onClick={() => navigate("/contas-pagar")}
                    className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{g.categoria}</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{fmtBRL(g.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evolução de faturamento */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
        <div className="font-display font-bold text-lg mb-1">Evolução de Faturamento Real</div>
        <div className="text-xs text-slate-500 mb-6">Baseado nas Notas Fiscais emitidas (Últimos 6 meses)</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={d.serie_faturamento || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-800" vertical={false} />
            <XAxis dataKey="mes" fontSize={12} stroke="#64748B" tickLine={false} axisLine={false} dy={10} tickFormatter={traduzirTexto} />
            <YAxis fontSize={12} stroke="#64748B" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={tooltipStyle} itemStyle={{ color: "#f8fafc" }} labelFormatter={traduzirTexto} />
            <Area type="monotone" dataKey="valor" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" activeDot={{ r: 6, strokeWidth: 0, fill: "#10B981" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Faturamento por Representada */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
          <Building2 className="w-4 h-4 text-[#075BFF]" />Faturamento por Representada
        </div>
        <div className="text-xs text-slate-500 mb-6">Comparativo entre volume de pedidos e valor efetivamente faturado</div>
        {fatPorRep.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
            <Building2 className="w-10 h-10 mb-2 opacity-20" />
            <span className="text-sm">Nenhuma representada com faturamento ainda.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fatPorRep} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-800" vertical={false} />
              <XAxis dataKey="nome" fontSize={11} stroke="#64748B" tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis fontSize={12} stroke="#64748B" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="volume" name="Volume" fill="#075BFF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="faturado" name="Faturado" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Produtos + Produtividade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold mb-4">
            <Package className="w-4 h-4 text-emerald-500" />Top 5 Produtos
          </div>
          {topProdutos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
              <Package className="w-10 h-10 mb-2 opacity-20" />
              <span className="text-sm">Nenhum produto vendido ainda.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {topProdutos.slice(0, 5).map((p, i) => (
                <div
                  key={i}
                  onClick={() => navigate("/representadas")}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{p.nome}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white ml-2">
                    {fmtBRL(p.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold mb-4">
            <Calendar className="w-4 h-4 text-[#08D5F5]" />Produtividade
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => navigate("/agenda")}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Calendar className="w-5 h-5 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtNum(d.visitas_realizadas)}</div>
              <div className="text-[10px] uppercase text-slate-500 mt-1 font-semibold">Visitas realizadas</div>
            </div>
            <div
              onClick={() => navigate("/funil")}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Target className="w-5 h-5 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtNum(d.propostas_negociacao)}</div>
              <div className="text-[10px] uppercase text-slate-500 mt-1 font-semibold">Propostas em negociação</div>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-gradient-to-r from-[#075BFF]/10 to-cyan-500/10 border border-[#075BFF]/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Taxa de conversão (visitas → pedidos)</span>
                <span className="font-mono font-bold text-[#075BFF] dark:text-cyan-400">
                  {d.visitas_realizadas > 0 
                    ? `${Math.round((d.pedidos_faturados / d.visitas_realizadas) * 100)}%` 
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para as linhas da Projeção (agora clicável)
function Row({ label, value, good, bad, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 ${
        onClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 -mx-2 rounded transition-colors" : ""
      }`}
    >
      <div className="text-sm text-slate-600 dark:text-slate-300">{label}</div>
      <div className={`font-mono font-bold ${good ? "text-emerald-600 dark:text-emerald-400" : bad ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>{value}</div>
    </div>
  );
}

// Componente para o Resumo do Mês (agora clicável)
function ResumoRow({ icon, label, value, valueClass = "text-slate-900 dark:text-white", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
        onClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""
      }`}
    >
      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">{icon}</div>
        {label}
      </div>
      <div className={`font-mono text-sm font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}