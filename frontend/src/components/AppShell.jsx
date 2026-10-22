import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, Users, Kanban, Calendar, Package, ShoppingCart, FileUp, Percent, Wallet, TrendingUp, MapPin, Sparkles, FileText, Settings, LogOut, Sun, Moon, Menu, Search, Bell, Bot } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import api from "../lib/api";
import { Toaster } from "./ui/sonner";
import TrialBanner from "./TrialBanner";
import Logo from "./Logo";

const nav = [
  { section: "Principal", items: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { to: "/max-ai", label: "MAX AI", icon: Bot, testId: "nav-max-ai", badge: "IA" },
    { to: "/insights", label: "Insights", icon: Sparkles, testId: "nav-insights" },
  ]},
  { section: "Gestão Comercial", items: [
    { to: "/representadas", label: "Representadas", icon: Building2, testId: "nav-representadas" },
    { to: "/clientes", label: "Clientes CRM", icon: Users, testId: "nav-clientes" },
    { to: "/funil", label: "Funil de Vendas", icon: Kanban, testId: "nav-funil" },
    { to: "/agenda", label: "Agenda & Visitas", icon: Calendar, testId: "nav-agenda" },
  ]},
  { section: "Catálogo & Vendas", items: [
    { to: "/produtos", label: "Produtos", icon: Package, testId: "nav-produtos" },
    { to: "/pedidos", label: "Pedidos", icon: ShoppingCart, testId: "nav-pedidos" },
    { to: "/xml", label: "Importação XML", icon: FileUp, testId: "nav-xml" },
  ]},
  { section: "Financeiro", items: [
    { to: "/comissoes", label: "Comissões", icon: Percent, testId: "nav-comissoes" },
    { to: "/contas-receber", label: "Contas a Receber", icon: TrendingUp, testId: "nav-ar" },
    { to: "/contas-pagar", label: "Contas a Pagar", icon: Wallet, testId: "nav-ap" },
  ]},
  { section: "Ferramentas", items: [
    { to: "/mapa", label: "Mapa Comercial", icon: MapPin, testId: "nav-mapa" },
    { to: "/documentos", label: "Documentos", icon: FileText, testId: "nav-documentos" },
    { to: "/planos", label: "Planos", icon: Sparkles, testId: "nav-planos" },
    { to: "/configuracoes", label: "Configurações", icon: Settings, testId: "nav-configuracoes" },
  ]},
];

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const runSearch = async (val) => {
    setQ(val);
    if (val.length < 2) return setResults(null);
    try { const { data } = await api.get(`/search?q=${encodeURIComponent(val)}`); setResults(data); } catch {}
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Sidebar — OMNIREP MAX navy identity */}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static z-40 h-full w-72 transition-transform duration-200 flex flex-col text-slate-200 border-r border-white/5`}
        style={{
          backgroundImage:
            "linear-gradient(180deg, #061329 0%, #081A33 55%, #0A1F46 100%)",
        }}
      >
        {/* subtle diagonal highlights */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.18]">
          <div className="absolute -top-20 -left-10 w-40 h-[160%] rotate-[20deg]"
               style={{ background: "linear-gradient(180deg, transparent, #075BFF, transparent)" }} />
          <div className="absolute -bottom-20 -right-6 w-24 h-[140%] rotate-[-18deg]"
               style={{ background: "linear-gradient(180deg, transparent, #08D5F5, transparent)" }} />
        </div>

        <div className="relative px-5 py-5 border-b border-white/10 flex items-center">
          <Logo variant="wordmark" size={32} onDark rounded={false} />
        </div>

        <nav className="relative flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          {nav.map((s) => (
            <div key={s.section} className="mb-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400/80 px-3 mb-2">
                {s.section}
              </div>
              {s.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === "/"}
                  data-testid={it.testId}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                      isActive
                        ? "bg-white/5 text-white font-semibold"
                        : "text-slate-300/90 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator: royal→cyan vertical bar */}
                      <span
                        aria-hidden
                        className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-opacity ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ background: "linear-gradient(180deg, #075BFF 0%, #08D5F5 100%)" }}
                      />
                      <it.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#22D3EE]" : "text-slate-400 group-hover:text-slate-200"}`} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ background: "linear-gradient(135deg,#075BFF,#08D5F5)" }}
                        >
                          {it.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="relative p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5 border border-white/5">
            {user?.logo ? (
              <img src={user.logo} alt="logo" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20" />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ring-1 ring-white/20"
                style={{ background: "linear-gradient(135deg,#075BFF,#08D5F5)" }}
              >
                {(user?.name || "U").charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-400 truncate capitalize">{user?.role}</div>
            </div>
            <button
              data-testid="btn-logout"
              onClick={async () => { await logout(); navigate("/login"); }}
              className="text-slate-400 hover:text-white p-1 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TrialBanner />
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center gap-3 px-4 sm:px-6">
          <button
            className="lg:hidden p-2 text-slate-600 hover:text-brand-navy"
            onClick={() => setOpen(!open)}
            data-testid="btn-sidebar-toggle"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            data-testid="btn-global-search"
            onClick={() => setSearchOpen(true)}
            className="flex-1 max-w-xl flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm text-slate-500 hover:border-[#075BFF] focus-within:border-[#075BFF] transition-colors"
          >
            <Search className="w-4 h-4" /> Pesquisar clientes, produtos, pedidos...
            <span className="ml-auto text-[10px] bg-slate-200 dark:bg-slate-800 rounded px-1.5 py-0.5 font-mono">Ctrl+K</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" data-testid="btn-notifications"><Bell className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={toggle} data-testid="btn-theme-toggle">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Busca Global</DialogTitle></DialogHeader>
          <Input data-testid="input-global-search" autoFocus placeholder="Digite ao menos 2 caracteres..." value={q} onChange={(e) => runSearch(e.target.value)} />
          {results && (
            <div className="max-h-80 overflow-y-auto space-y-3 mt-2">
              {["clientes", "produtos", "representadas", "pedidos"].map((k) => results[k]?.length > 0 && (
                <div key={k}>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{k}</div>
                  {results[k].map((r) => (
                    <div key={r.id} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm">
                      {r.nome_fantasia || r.razao_social || r.nome || r.numero}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
