import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  LayoutDashboard, Sparkles, BarChart3, MessageSquare,
  Building2, Users, Filter, Calendar,
  ShoppingCart, UploadCloud, Percent, TrendingUp, TrendingDown,
  FileText, Map, Settings, LogOut, Search, Menu, X, ExternalLink, UserPlus,
  Sun, Moon, Bell, Package, ShieldAlert, Clock, Landmark
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import api from "../lib/api";
import { toast } from "sonner";

const MENU_SECTIONS = [
  {
    title: "Principal",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "MAX AI", icon: Sparkles, path: "/max-ai" },
      { label: "Insights", icon: BarChart3, path: "/insights" },
    ]
  },
  {
    title: "Gestão Comercial",
    items: [
      { label: "Representadas", icon: Building2, path: "/representadas" },
      { label: "Clientes CRM", icon: Users, path: "/clientes" },
      { label: "Funil de Vendas", icon: Filter, path: "/funil" },
      { label: "Agenda", icon: Calendar, path: "/agenda" },
    ]
  },
  {
    title: "Catálogo & Vendas",
    items: [
      { label: "Pedidos", icon: ShoppingCart, path: "/pedidos" },
      { label: "Importar XML", icon: UploadCloud, path: "/xml" },
      { label: "Aguardando Faturamento", icon: Clock, path: "/pedidos/aguardando-faturamento" },
    ]
  },
  {
    title: "Financeiro",
    items: [
      { label: "Comissões", icon: Percent, path: "/comissoes" },
      { label: "Contas a Receber", icon: TrendingUp, path: "/contas-receber" },
      { label: "Contas a Pagar", icon: TrendingDown, path: "/contas-pagar" },
      { label: "Recebíveis Indústria", icon: Landmark, path: "/recebiveis-industria" },
    ]
  },
  {
    title: "Ferramentas",
    items: [
      { label: "Relatórios", icon: FileText, path: "/relatorios" },
      { label: "Mapa Comercial", icon: Map, path: "/mapa" },
      { label: "Feedback", icon: MessageSquare, path: "/feedback" },
      { label: "Configurações", icon: Settings, path: "/configuracoes" },
    ]
  }
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const menuSections = [...MENU_SECTIONS];
  if (user?.role === "admin") {
    menuSections.push({
      title: "Administração",
      items: [
        { label: "Painel Admin", icon: ShieldAlert, path: "/admin" }
      ]
    });
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCNPJ = (str) => /^\d{14}$/.test(str.replace(/\D/g, ''));

  useEffect(() => {
    if (!searchQuery || isCNPJ(searchQuery)) {
      setSearchResults(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/search?q=${searchQuery}`);
        setSearchResults(res.data);
        setShowDropdown(true);
      } catch (error) {
        console.error("Erro na busca", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setShowDropdown(true);
  };

  const navigateToResult = (path) => {
    navigate(path);
    setShowDropdown(false);
    setSearchQuery("");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden transition-colors duration-300">
      
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileOpen(false)} 
        />
      )}

      {/* SIDEBAR - AZUL METÁLICO FUTURISTA CONSTANTE */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out
        bg-gradient-to-b from-[#060C1A] via-[#0A1838] to-[#060C1A] border-r border-[#1E3A8A]/40
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:static"}
      `}>
        
        {/* Glow e Grid de fundo na Sidebar */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute top-0 left-0 w-full h-[200px] bg-[#075BFF]/20 blur-[100px] pointer-events-none rounded-full" />

        {/* Logo / Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-[#1E3A8A]/40 relative z-10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <img src="/logo.png" alt="OmniRepMax" className="h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(8,213,245,0.6)]" />
            <span className="font-bold text-2xl tracking-tight text-white">
              OMNIREP<span className="text-[#08D5F5] drop-shadow-[0_0_8px_rgba(8,213,245,0.8)]">MAX</span>
            </span>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setIsMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar relative z-10">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="px-2 text-[10px] font-bold text-[#4A90E2]/70 uppercase tracking-widest mb-3">
                {section.title}
              </h3>
              <nav className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 group overflow-hidden ${
                        isActive
                          ? "bg-gradient-to-r from-[#075BFF]/40 to-transparent text-white shadow-[inset_0_0_20px_rgba(8,213,245,0.1)]"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Barrinha lateral azul neon para o item ativo */}
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#08D5F5] shadow-[0_0_15px_rgba(8,213,245,0.8)]" />
                        )}
                        <item.icon className={`w-4 h-4 transition-all duration-300 ${isActive ? "text-[#08D5F5] drop-shadow-[0_0_8px_rgba(8,213,245,0.5)]" : "text-slate-500 group-hover:text-slate-300"}`} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-[#1E3A8A]/40 relative z-10 bg-black/20">
          <div className="flex items-center gap-3 mb-2 p-2 rounded-xl bg-white/5 border border-white/5 shadow-inner">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#075BFF] to-[#08D5F5] flex items-center justify-center text-white font-bold overflow-hidden shadow-[0_0_15px_rgba(8,213,245,0.4)]">
              {user?.logo ? (
                <img src={user.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-[#4A90E2] truncate">{user?.empresa || "Admin"}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background transition-colors duration-300">
        
        {/* TOPBAR - AZUL METÁLICO FUTURISTA CONSTANTE */}
        <header className="h-20 border-b border-[#1E3A8A]/40 bg-gradient-to-r from-[#060C1A] via-[#0A1838] to-[#060C1A] flex items-center justify-between px-4 sm:px-6 gap-4 z-30 relative shadow-lg">
          {/* Linha de brilho sutil no topo do header */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#08D5F5]/50 to-transparent"></div>

          <div className="flex items-center gap-3 flex-1 relative z-10">
            <button className="md:hidden text-slate-400" onClick={() => setIsMobileOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            
            {/* BARRA DE PESQUISA */}
            <div className="relative w-full max-w-lg hidden sm:block" ref={searchRef}>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#08D5F5] transition-colors" />
                <Input 
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Pesquisar clientes, CNPJ, pedidos..." 
                  className="h-11 pl-11 bg-[#0A1838]/50 border-[#1E3A8A]/50 text-white placeholder:text-slate-500 focus:border-[#08D5F5] focus:bg-[#0A1838] focus:shadow-[0_0_15px_rgba(8,213,245,0.2)] transition-all rounded-full text-base"
                />
              </div>

              {/* Dropdown de Busca */}
              {showDropdown && isCNPJ(searchQuery) && (
                <div className="absolute top-full mt-2 w-full bg-[#060C1A] border border-[#1E3A8A]/50 rounded-xl shadow-2xl p-3 z-50">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Ações para o CNPJ digitado:</p>
                  <div className="flex flex-col gap-1">
                    <a href={`https://www.google.com/search?q=${searchQuery}+Receita+Federal`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm p-2 hover:bg-white/5 rounded-lg text-slate-300 transition-colors">
                      <ExternalLink className="w-4 h-4 text-[#08D5F5]" /> Consultar na Receita Federal
                    </a>
                    <a href={`https://www.linkedin.com/search/results/companies/?keywords=${searchQuery}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm p-2 hover:bg-white/5 rounded-lg text-slate-300 transition-colors">
                      <ExternalLink className="w-4 h-4 text-[#075BFF]" /> Buscar no LinkedIn
                    </a>
                    <button onClick={() => { navigate(`/clientes?cnpj=${searchQuery}`); setShowDropdown(false); }} className="flex items-center gap-2 text-sm p-2 hover:bg-white/5 rounded-lg text-[#08D5F5] font-medium text-left transition-colors">
                      <UserPlus className="w-4 h-4" /> Cadastrar Cliente com este CNPJ
                    </button>
                  </div>
                </div>
              )}

              {showDropdown && !isCNPJ(searchQuery) && searchResults && (
                <div className="absolute top-full mt-2 w-full bg-[#060C1A] border border-[#1E3A8A]/50 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                  {isSearching && <div className="p-4 text-center text-sm text-slate-500">Buscando...</div>}
                  
                  {!isSearching && searchResults.clientes?.length === 0 && searchResults.produtos?.length === 0 && searchResults.pedidos?.length === 0 && (
                    <div className="p-4 text-center text-sm text-slate-500">Nenhum resultado encontrado.</div>
                  )}

                  {searchResults.clientes?.length > 0 && (
                    <div className="border-b border-white/5">
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase bg-white/5">Clientes</div>
                      {searchResults.clientes.map(c => (
                        <div key={c.id} onClick={() => navigateToResult(`/clientes`)} className="px-4 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors">
                          <Users className="w-4 h-4 text-[#075BFF]" />
                          <div>
                            <div className="text-sm font-semibold text-white">{c.nome_fantasia || c.razao_social}</div>
                            <div className="text-xs text-slate-500">{c.cnpj_cpf}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.produtos?.length > 0 && (
                    <div className="border-b border-white/5">
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase bg-white/5">Produtos</div>
                      {searchResults.produtos.map(p => (
                        <div key={p.id} onClick={() => navigateToResult(`/representadas`)} className="px-4 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors">
                          <Package className="w-4 h-4 text-emerald-500" />
                          <div>
                            <div className="text-sm font-semibold text-white">{p.nome}</div>
                            <div className="text-xs text-slate-500">{p.codigo || p.sku}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.pedidos?.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase bg-white/5">Pedidos</div>
                      {searchResults.pedidos.map(p => (
                        <div key={p.id} onClick={() => navigateToResult(`/pedidos`)} className="px-4 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors">
                          <ShoppingCart className="w-4 h-4 text-amber-500" />
                          <div className="text-sm font-semibold text-white">{p.numero}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ações do Topbar (Lado Direito) - AGORA INTEGRADO AO DESIGN METÁLICO */}
          <div className="flex items-center gap-3 relative z-10">
            
            {/* Divisor Luminoso */}
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[#1E3A8A] to-transparent mx-2 hidden sm:block"></div>

            {/* Botão de Tema (Painel Metálico) */}
            <button 
              onClick={toggleTheme} 
              className="w-10 h-10 rounded-xl bg-[#0A1838] border border-[#1E3A8A]/50 flex items-center justify-center text-slate-400 hover:text-[#08D5F5] hover:border-[#08D5F5]/80 hover:shadow-[0_0_15px_rgba(8,213,245,0.3)] hover:-translate-y-0.5 transition-all duration-300 group"
            >
              {theme === 'dark' 
                ? <Sun className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors" /> 
                : <Moon className="w-5 h-5 group-hover:text-[#08D5F5] transition-colors" />
              }
            </button>
            
            {/* Botão de Notificação (Painel Metálico) */}
            <button 
              className="w-10 h-10 rounded-xl bg-[#0A1838] border border-[#1E3A8A]/50 flex items-center justify-center text-slate-400 hover:text-[#08D5F5] hover:border-[#08D5F5]/80 hover:shadow-[0_0_15px_rgba(8,213,245,0.3)] hover:-translate-y-0.5 transition-all duration-300 relative group"
              onClick={() => toast.info("Você não tem novas notificações no momento.")}
            >
              <Bell className="w-5 h-5 group-hover:text-[#08D5F5] transition-colors" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#08D5F5] rounded-full border-2 border-[#0A1838] shadow-[0_0_8px_rgba(8,213,245,0.8)] animate-pulse"></span>
            </button>
          </div>
        </header>

        {/* CONTENT AREA (Muda de cor com o tema) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setShowDropdown(false)}>
          <Outlet /> 
        </div>
      </main>
    </div>
  );
}