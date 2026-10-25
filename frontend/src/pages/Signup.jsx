import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Check, ArrowLeft, Sun, Moon } from "lucide-react";

export default function Signup() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    empresa: "", 
    telefone: "",
    tamanho_operacao: "solo",
    controle_atual: "planilha"
  });
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/signup", form);
      if (data.token) localStorage.setItem("omnirep_token", data.token);
      toast.success("Conta criada! Bem-vindo ao OMNIREP MAX.");
      window.location.href = "/dashboard";
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erro ao criar conta");
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-5 bg-background transition-colors duration-300">
      
      {/* LADO ESQUERDO - DESIGN TECNOLÓGICO */}
      <div className="hidden lg:flex lg:col-span-2 flex-col justify-between p-12 text-white relative overflow-hidden bg-[#09090B]">
        
        {/* Efeitos de fundo (Grade e Glows) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)]"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#075BFF]/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]"></div>

        {/* Logo e Botão Voltar */}
        <div className="relative z-10 flex flex-col gap-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Voltar para o site
          </Link>
          <img src="/logo.png" alt="OmniRepMax" className="h-20 sm:h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(8,213,245,0.4)]" />
        </div>

        {/* Textos e Benefícios */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight mb-3">
              Comece agora. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#075BFF]">7 dias grátis.</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>
          
          <ul className="space-y-4 text-sm font-medium text-slate-300">
            {[
              "CRM com clientes e prospects ilimitados", 
              "Pedidos com cálculo automático de comissão", 
              "Funil Kanban drag-and-drop", 
              "MAX AI em linguagem natural", 
              "Importação de XML NF-e", 
              "Insights comerciais inteligentes", 
              "Dashboard financeiro completo"
            ].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#075BFF]/20 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} OMNIREP MAX — SaaS para representantes comerciais.
        </div>
      </div>

      {/* LADO DIREITO - FORMULÁRIO */}
      <div className="lg:col-span-3 flex items-center justify-center p-6 sm:p-12 relative bg-background">
        
        {/* Botão de Tema no mobile/topo direito */}
        <div className="absolute top-6 right-6 z-20">
          <button onClick={toggleTheme} className="p-2 rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Card do Formulário */}
        <div className="w-full max-w-xl bg-card border border-border p-8 sm:p-10 rounded-3xl shadow-xl relative z-10">
          
          {/* Logo no mobile */}
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/logo.png" alt="OmniRepMax" className="h-16 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Criar conta grátis</h2>
            <p className="text-sm text-muted-foreground mt-2">Comece a usar o OMNIREP MAX em 60 segundos.</p>
          </div>
          
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-foreground">Nome completo *</label>
                <input 
                  type="text" required placeholder="Seu nome completo" autoComplete="name"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" 
                />
              </div>
              
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-foreground">E-mail *</label>
                <input 
                  type="email" required placeholder="seu@email.com" autoComplete="email"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" 
                />
              </div>
              
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-foreground">Senha * (mín. 8 caracteres)</label>
                <input 
                  type="password" required placeholder="********" autoComplete="new-password"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Empresa / Escritório</label>
                <input 
                  type="text" placeholder="Opcional" autoComplete="organization"
                  value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Telefone</label>
                <input 
                  type="tel" placeholder="(11) 99999-0000" autoComplete="tel"
                  value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" 
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-foreground">Qual o tamanho da sua operação?</label>
                <select 
                  value={form.tamanho_operacao} 
                  onChange={(e) => setForm({ ...form, tamanho_operacao: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="solo">Sou Representante Solo</option>
                  <option value="pequena">Equipe Pequena (2 a 5 pessoas)</option>
                  <option value="grande">Equipe Grande (Mais de 5 pessoas)</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-foreground">Como você controla suas comissões hoje?</label>
                <select 
                  value={form.controle_atual} 
                  onChange={(e) => setForm({ ...form, controle_atual: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="planilha">Planilhas de Excel</option>
                  <option value="caderno">Caderno / Anotações</option>
                  <option value="outro">Outro Sistema</option>
                  <option value="nada">Não tenho controle</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" disabled={busy} 
              className="w-full h-12 mt-2 bg-[#075BFF] hover:bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-[#075BFF]/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "Criando conta..." : "Criar minha conta"}
            </button>
            
            <div className="text-sm text-center text-muted-foreground pt-4 border-t border-border mt-4">
              Já tem conta? <Link to="/login" className="font-semibold text-[#075BFF] hover:underline">Entrar</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}