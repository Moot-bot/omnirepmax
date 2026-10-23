import React from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext"; // Presumindo que você tem esse contexto
import { 
  LayoutDashboard, Sparkles, BarChart3, Building2, Users, 
  Filter, Calendar, ShoppingCart, Percent, TrendingUp, 
  TrendingDown, Map, UploadCloud, Settings, LogOut, FileText,
  Sun, Moon, Bell
} from "lucide-react";
import { Button } from "./ui/button";

const MENU_SECTIONS = [
  {
    title: "Principal",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
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
    ]
  },
  {
    title: "Financeiro",
    items: [
      { label: "Comissões", icon: Percent, path: "/comissoes" },
      { label: "Contas a Receber", icon: TrendingUp, path: "/contas-receber" },
      { label: "Contas a Pagar", icon: TrendingDown, path: "/contas-pagar" },
    ]
  },
  {
    title: "Ferramentas",
    items: [
      { label: "Relatórios", icon: FileText, path: "/relatorios" },
      { label: "Mapa Comercial", icon: Map, path: "/mapa" },
      { label: "Configurações", icon: Settings, path: "/configuracoes" },
    ]
  }
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme(); // Assumindo que seu ThemeContext tem isso
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      
      {/* SIDEBAR */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex z-10">
        
        {/* Logo / Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 relative">
          <div className="flex items-center gap-2 text-[#075BFF] font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white">🚀</div>
            OMNIREP<span className="text-slate-900 dark:text-white">MAX</span>
          </div>
          <span className="absolute right-4 top-4 text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
            v2.0
          </span>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {MENU_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <nav className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
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
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold overflow-hidden">
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
          <Button variant="outline" className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 border-slate-200 dark:border-slate-800" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        
        {/* Topbar com Toggle de Tema */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-end px-6 gap-4">
           <Button variant="ghost" size="icon" onClick={toggleTheme}>
             {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
           </Button>
           <Button variant="ghost" size="icon">
             <Bell className="w-5 h-5 text-slate-500" />
           </Button>
        </header>

        {/* Aqui é onde as páginas são renderizadas! */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet /> 
        </div>
      </main>
    </div>
  );
}