import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  LayoutDashboard, Sparkles, BarChart3, MessageSquare,
  Building2, Users, Filter, Calendar,
  ShoppingCart, UploadCloud,
  Percent, TrendingUp, TrendingDown,
  FileText, Map, Settings, LogOut,
  Search, Menu, X, ExternalLink, UserPlus,
  Sun, Moon, Bell, Package, ShieldAlert,
  Clock, Landmark
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
    const val = e.target.value;
    setSearchQuery(val);
    setShowDropdown(true);
  };

  const navigateToResult = (path) => {
    navigate(path);
    setShowDropdown(false);
    setSearchQuery("");
  };

  return (
    /* ✅ MUDANÇA 1: bg-slate-50 alterado para bg-background */
    <div className="flex h-screen bg-background dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileOpen(false)} 
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:static"}
      `}>
        
        {/* Logo / Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            {/* ✅ MUDANÇA 2: Logo substituindo o foguete e o texto */}
            <img src="/logo.png" alt="OmniRepMax" className="h-8 w-auto object-contain" />
            <span className="ml-1 text-[10px] font-bold bg-[#075BFF] text-white px-2 py-0.5 rounded-full">
              v2.0
            </span>
          </div>
          <button className="md:hidden text-slate-500" onClick={() => setIsMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <nav className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[#075BFF]/10 text-[#075BFF] dark:bg-[#075BFF]/20 dark:text-[#3b82f6]"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={`w-4 h-4 ${isActive ? "text-[#075BFF] dark:text-[#3b82f6]" : ""}`} />
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold overflow-hidden border border-slate-300 dark:border-slate-700">
              {user?.logo ? (
                <img src={user.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.empresa || "Admin"}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 border-slate-200 dark:border-slate-800 transition-colors" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      {/* ✅ MUDANÇA 3: bg-slate-50 alterado para bg-background */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-slate-950 transition-colors duration-300">
        
        {/* TOPBAR */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 sm:px-6 gap-4 z-30">
          
          <div className="flex items-center gap-3 flex-1">
            <button className="md:hidden text-slate-600 dark:text-slate-300" onClick={() => setIsMobileOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            
            {/* BARRA DE PESQUISA */}
            <div className="relative w-full max-w-md hidden sm:block" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Pesquisar clientes, CNPJ, pedidos..." 
                  className="pl-9 bg-slate-100 dark:bg-slate-800 border-transparent focus:border-[#075BFF] focus:bg-white dark:focus:bg-slate-900 transition-all rounded-full"
                />
              </div>

              {showDropdown && isCNPJ(searchQuery) && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-50">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Ações para o CNPJ digitado:</p>
                  <div className="flex flex-col gap-1">
                    <a href={`https://www.google.com/search?q=${searchQuery}+Receita+Federal`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                      <ExternalLink className="w-4 h-4 text-blue-500" /> Consultar na Receita Federal
                    </a>
                    <a href={`https://www.linkedin.com/search/results/companies/?keywords=${searchQuery}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                      <ExternalLink className="w-4 h-4 text-blue-700" /> Buscar no LinkedIn
                    </a>
                    <button onClick={() => { navigate(`/clientes?cnpj=${searchQuery}`); setShowDropdown(false); }} className="flex items-center gap-2 text-sm p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-[#075BFF] font-medium text-left">
                      <UserPlus className="w-4 h-4" /> Cadastrar Cliente com este CNPJ
                    </button>
                  </div>
                </div>
              )}

              {showDropdown && !isCNPJ(searchQuery) && searchResults && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                  {isSearching && <div className="p-4 text-center text-sm text-slate-500">Buscando...</div>}
                  
                  {!isSearching && searchResults.clientes?.length === 0 && searchResults.produtos?.length === 0 && searchResults.pedidos?.length === 0 && (
                    <div className="p-4 text-center text-sm text-slate-500">Nenhum resultado encontrado.</div>
                  )}

                  {searchResults.clientes?.length > 0 && (
                    <div className="border-b border-slate-100 dark:border-slate-700">
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50">Clientes</div>
                      {searchResults.clientes.map(c => (
                        <div key={c.id} onClick={() => navigateToResult(`/clientes`)} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3">
                          <Users className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="text-sm font-semibold">{c.nome_fantasia || c.razao_social}</div>
                            <div className="text-xs text-slate-500">{c.cnpj_cpf}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.produtos?.length > 0 && (
                    <div className="border-b border-slate-100 dark:border-slate-700">
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50">Produtos</div>
                      {searchResults.produtos.map(p => (
                        <div key={p.id} onClick={() => navigateToResult(`/representadas`)} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3">
                          <Package className="w-4 h-4 text-emerald-500" />
                          <div>
                            <div className="text-sm font-semibold">{p.nome}</div>
                            <div className="text-xs text-slate-500">{p.codigo || p.sku}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.pedidos?.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50">Pedidos</div>
                      {searchResults.pedidos.map(p => (
                        <div key={p.id} onClick={() => navigateToResult(`/pedidos`)} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3">
                          <ShoppingCart className="w-4 h-4 text-amber-500" />
                          <div className="text-sm font-semibold">{p.numero}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ações do Topbar */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full relative"
              onClick={() => toast.info("Você não tem novas notificações no momento.")}
            >
              <Bell className="w-5 h-5 text-slate-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setShowDropdown(false)}>
          <Outlet /> 
        </div>
      </main>
    </div>
  );
}