import React, { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Zap, TrendingUp, Shield } from "lucide-react";
import Logo from "../components/Logo";

export default function Login() {
  const { user, login, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("alvarofilho39@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  
  // ✅ CORREÇÃO 1: Se já estiver logado, vai direto pro Dashboard e não pra Landing
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault(); 
    setBusy(true);
    try { 
      await login(email, password); 
      toast.success("Bem-vindo!"); 
      // ✅ CORREÇÃO 2: Após logar, redireciona para o Dashboard
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
      {/* Dark brand panel */}
      <div
        className="hidden lg:flex lg:col-span-3 flex-col justify-between p-12 text-slate-100 relative overflow-hidden brand-diagonals"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 30%, rgba(7,91,255,0.25) 0, transparent 45%), radial-gradient(circle at 85% 80%, rgba(8,213,245,0.22) 0, transparent 50%), linear-gradient(135deg, #061329 0%, #0A1F46 55%, #0B2F70 100%)",
        }}
      >
        <div className="relative flex justify-center">
          <Logo variant="stacked" size={380} onDark />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-6"
               style={{ background: "rgba(8,213,245,0.12)", borderColor: "rgba(8,213,245,0.35)", color: "#A5F3FC" }}>
            <Zap className="w-3.5 h-3.5" /> SaaS brasileiro para representantes
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.08]">
            Você representa.
            <br />
            <span className="text-brand-gradient">O OMNIREP MAX gerencia.</span>
          </h1>
          <p className="mt-6 text-slate-300 max-w-md leading-relaxed">
            Tudo da sua representação — CRM, pedidos, comissões, financeiro e MAX AI — em uma única plataforma SaaS brasileira.
          </p>
          <div className="mt-8 space-y-3 max-w-md">
            {[["Multi-tenant seguro", Shield], ["MAX AI em linguagem natural", Zap], ["Comissões em tempo real", TrendingUp]].map(([t, I], i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                     style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(8,213,245,0.25)" }}>
                  <I className="w-4 h-4 text-[#22D3EE]" />
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-slate-400">© 2026 OMNIREP MAX — SaaS brasileiro para representantes comerciais</div>
      </div>

      {/* Login form */}
      <div className="lg:col-span-2 flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <Logo variant="wordmark" size={36} onDark={false} />
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#152238]">Entrar</h2>
            <p className="text-sm text-slate-500 mt-1">Acesse sua central comercial.</p>
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input data-testid="input-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                   className="h-11 focus-visible:ring-[#075BFF] focus-visible:ring-offset-0 focus-visible:border-[#075BFF]" />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input data-testid="input-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                   className="h-11 focus-visible:ring-[#075BFF] focus-visible:ring-offset-0 focus-visible:border-[#075BFF]" />
          </div>
          <Button type="submit" data-testid="btn-login" disabled={busy}
                  className="w-full h-11 bg-brand-cta hover:brightness-110 text-white border-0 shadow-md shadow-[#075BFF]/20">
            {busy ? "Entrando..." : "Entrar"}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-slate-500 hover:text-[#075BFF] transition-colors">Esqueci minha senha</Link>
            <Link to="/signup" data-testid="link-signup" className="font-semibold text-[#075BFF] hover:underline">Criar conta grátis →</Link>
          </div>
        </form>
      </div>
    </div>
  );
}