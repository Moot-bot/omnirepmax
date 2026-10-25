import React, { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Zap, TrendingUp, Shield, ArrowRight, Lock, Mail, Database, Users, ArrowLeft, Sun, Moon } from "lucide-react";

export default function Login() {
  const { user, login, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const [email, setEmail] = useState("alvarofilho39@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault(); 
    setBusy(true);
    try { 
      await login(email, password); 
      toast.success("Bem-vindo!"); 
      nav("/dashboard"); 
    }
    catch (err) { 
      toast.error(err?.response?.data?.detail || "Falha no login"); 
    }
    finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-5 bg-slate-50 dark:bg-[#09090B]">
      
      {/* PAINEL ESQUERDO - DESIGN TECNOLÓGICO */}
      <div className="hidden lg:flex lg:col-span-3 flex-col justify-between p-12 text-slate-100 relative overflow-hidden bg-white dark:bg-[#09090B] border-r border-slate-200 dark:border-slate-800">
        
        {/* BOTOES VOLTAR E TEMA */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#075BFF] dark:text-slate-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para o site
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </Button>
        </div>

        {/* Fundo Grade Tecnológica - Opacidade menor no modo claro */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)] opacity-20 dark:opacity-100"></div>
        
        {/* Glows Neon */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#075BFF]/10 dark:bg-[#075BFF]/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]"></div>

        {/* LOGO DE FUNDO (WATERMARK) */}
        <img 
          src="/logo.png" 
          alt="" 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-[700px] opacity-[0.02] dark:opacity-[0.03] pointer-events-none select-none" 
        />

        {/* Conteúdo Superior */}
        <div className="relative z-10 mt-12">
          <img src="/logo.png" alt="OmniRepMax" className="h-16 sm:h-20 w-auto object-contain mb-8 dark:drop-shadow-[0_0_20px_rgba(8,213,245,0.4)]" />
          
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-white">
            A central inteligente <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#075BFF] to-cyan-500 dark:from-cyan-400 dark:to-[#075BFF]">
              da sua representação.
            </span>
          </h1>
          <p className="mt-6 text-slate-600 dark:text-slate-400 max-w-md text-lg leading-relaxed">
            Gerencie comissões, pedidos e faturamento em uma única plataforma. Deixe a tecnologia trabalhar por você.
          </p>
        </div>

        {/* MOCKUP DO SISTEMA */}
        <div className="relative z-10 mt-10 bg-slate-50 dark:bg-[#1E293B]/70 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl rounded-2xl p-4 shadow-sm dark:shadow-[0_0_50px_-10px_rgba(8,213,245,0.3)] max-w-2xl h-72 flex gap-4 overflow-hidden">
          {/* Barra Lateral Mockup */}
          <div className="w-16 h-full border-r border-slate-200 dark:border-slate-700/50 flex flex-col items-center py-2 gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#075BFF]/10 dark:bg-[#075BFF]/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#075BFF] dark:text-cyan-400" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center">
              <Database className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
          </div>

          {/* Conteúdo Mockup */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Header Mockup */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex gap-2">
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
                <div className="w-12 h-4 bg-slate-100 dark:bg-slate-700/30 rounded"></div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
            </div>

            {/* Cards Mockup */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded mb-2"></div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">R$ 14.250</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">+12% este mês</div>
              </div>
              <div className="bg-white dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded mb-2"></div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">R$ 8.400</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Recebidas</div>
              </div>
              <div className="bg-white dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded mb-2"></div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">42</div>
                <div className="text-[10px] text-[#075BFF] dark:text-cyan-400 mt-1">Pedidos abertos</div>
              </div>
            </div>

            {/* Gráfico Mockup */}
            <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-end p-3 gap-1.5">
              {[40, 70, 45, 90, 65, 100, 80, 50, 95, 60, 75, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-[#075BFF] to-cyan-400/80 rounded-t-sm" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé do Painel */}
        <div className="relative z-10 flex items-center gap-4 mt-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" /> Multi-tenant</div>
          <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> MAX AI</div>
        </div>
      </div>

      {/* PAINEL DIREITO - FORMULÁRIO */}
      <div className="lg:col-span-2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md bg-transparent relative z-10">
          
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/logo.png" alt="OmniRepMax" className="h-16 w-auto object-contain" />
          </div>
          
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Acesse sua conta</h2>
            <p className="text-sm text-slate-500 mt-2">Bem-vindo de volta. Insira suas credenciais.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                  className="h-12 pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus-visible:ring-[#075BFF]" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">Senha</Label>
                <Link to="/forgot-password" className="text-xs text-[#075BFF] hover:underline font-medium">Esqueceu a senha?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required
                  className="h-12 pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus-visible:ring-[#075BFF]" 
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={busy}
              className="w-full h-12 mt-2 bg-[#075BFF] hover:bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-[#075BFF]/30 transition-all active:scale-[0.98]"
            >
              {busy ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-sm text-slate-500">
              Ainda não tem conta? <Link to="/signup" className="font-semibold text-[#075BFF] hover:underline">Criar conta grátis <ArrowRight className="inline w-3 h-3 ml-1"/></Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}