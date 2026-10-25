import React, { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Zap, TrendingUp, Shield, ArrowRight, Lock, Mail } from "lucide-react";

export default function Login() {
  const { user, login, loading } = useAuth();
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
    <div className="min-h-screen grid lg:grid-cols-5 bg-background">
      {/* PAINEL ESQUERDO - DESIGN TECNOLÓGICO */}
      <div className="hidden lg:flex lg:col-span-3 flex-col justify-between p-12 text-slate-100 relative overflow-hidden bg-[#09090B]">
        
        {/* Fundo Grade Tecnológica */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)]"></div>
        
        {/* Glows Neon */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#075BFF]/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]"></div>

        {/* Conteúdo Superior */}
        <div className="relative z-10">
          {/* USA A LOGO PNG AQUI */}
          <img src="/logo.png" alt="OmniRepMax" className="h-12 w-auto object-contain mb-12 drop-shadow-[0_0_15px_rgba(8,213,245,0.4)]" />
          
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.1]">
            A central inteligente <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#075BFF]">
              da sua representação.
            </span>
          </h1>
          <p className="mt-6 text-slate-400 max-w-md text-lg leading-relaxed">
            Gerencie comissões, pedidos e faturamento em uma única plataforma. Deixe a tecnologia trabalhar por você.
          </p>
        </div>

        {/* Card Flutuante Simulando o Sistema (Mockup) */}
        <div className="relative z-10 mt-12 bg-[#1E293B]/60 border border-slate-700/50 backdrop-blur-md rounded-2xl p-6 shadow-[0_0_40px_-10px_rgba(8,213,245,0.3)] max-w-md">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Resumo de Comissões
            </div>
            <div className="text-[10px] text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded font-bold uppercase">Mês Atual</div>
          </div>
          <div className="flex gap-4 mb-5">
            <div className="flex-1 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase mb-1">Previstas</div>
              <div className="text-xl font-bold text-white">R$ 14.250</div>
            </div>
            <div className="flex-1 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase mb-1">Recebidas</div>
              <div className="text-xl font-bold text-emerald-400">R$ 8.400</div>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#075BFF] to-cyan-400 w-[65%]"></div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 text-right">65% da meta</div>
        </div>

        {/* Rodapé do Painel */}
        <div className="relative z-10 flex items-center gap-4 mt-12 text-xs text-slate-500">
          <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Multi-tenant</div>
          <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> MAX AI</div>
        </div>
      </div>

      {/* PAINEL DIREITO - FORMULÁRIO */}
      <div className="lg:col-span-2 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Formulário dentro de um Card Branco Premium */}
        <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 relative z-10">
          
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/logo.png" alt="OmniRepMax" className="h-10 w-auto object-contain" />
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
                  data-testid="input-email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                  className="h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus-visible:ring-[#075BFF]" 
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
                  data-testid="input-password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required
                  className="h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus-visible:ring-[#075BFF]" 
                />
              </div>
            </div>

            {/* BOTÃO ENTRAR - SUPER VISÍVEL */}
            <Button 
              type="submit" 
              data-testid="btn-login" 
              disabled={busy}
              className="w-full h-12 mt-2 bg-[#075BFF] hover:bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-[#075BFF]/30 transition-all active:scale-[0.98]"
            >
              {busy ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-sm text-slate-500">
              Ainda não tem conta? <Link to="/signup" className="font-semibold text-[#075BFF] hover:underline">Criar conta grátis <ArrowRight className="inline w-3 h-3 ml-1"/></Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}