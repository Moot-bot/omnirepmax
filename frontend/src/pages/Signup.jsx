import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Check } from "lucide-react";
import Logo from "../components/Logo";

export default function Signup() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", empresa: "", telefone: "" });
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  
  // ✅ CORREÇÃO 1: Se já estiver logado, manda pro Dashboard em vez da Landing
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    
    // ✅ CORREÇÃO 2: Backend exige 8 caracteres
    if (form.password.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres");
    
    setBusy(true);
    try {
      const { data } = await api.post("/auth/signup", form);
      if (data.token) localStorage.setItem("omnirep_token", data.token);
      toast.success("Conta criada! Bem-vindo ao OMNIREP MAX.");
      
      // ✅ CORREÇÃO 3: Redireciona para o Dashboard forçando recarregamento da sessão
      window.location.href = "/dashboard";
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erro ao criar conta");
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-5 bg-slate-50">
      <div
        className="hidden lg:flex lg:col-span-2 flex-col justify-between p-10 text-slate-100 relative overflow-hidden brand-diagonals"
        style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(7,91,255,0.28) 0, transparent 45%), radial-gradient(circle at 85% 85%, rgba(8,213,245,0.22) 0, transparent 48%), linear-gradient(135deg, #061329 0%, #0A1F46 55%, #0B2F70 100%)" }}
      >
        <div className="relative">
          <Logo variant="wordmark" size={38} onDark />
        </div>
        <div className="relative space-y-6">
          <h1 className="font-display text-3xl xl:text-4xl font-extrabold leading-tight">Comece agora. <span className="text-brand-gradient">7 dias grátis.</span></h1>
          <ul className="space-y-3 text-sm">
            {["CRM com clientes e prospects ilimitados", "Pedidos com cálculo automático de comissão", "Funil Kanban drag-and-drop", "MAX AI em linguagem natural", "Importação de XML NF-e", "Insights comerciais inteligentes", "Dashboard financeiro completo", "App instalável no celular (PWA)"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-[#22D3EE]" />{f}</li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-slate-400">Sem cartão de crédito. Cancele quando quiser.</div>
      </div>
      <div className="lg:col-span-3 flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-lg space-y-5">
          <div className="lg:hidden">
            <Logo variant="wordmark" size={34} onDark={false} />
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold">Criar conta grátis</h2>
            <p className="text-sm text-slate-500 mt-1">Comece a usar o OMNIREP MAX em 60 segundos.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2"><Label>Nome completo *</Label><Input data-testid="sign-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu nome" /></div>
            <div className="space-y-1 sm:col-span-2"><Label>E-mail *</Label><Input data-testid="sign-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Senha * (mín. 8)</Label><Input data-testid="sign-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-1"><Label>Empresa / Escritório</Label><Input data-testid="sign-empresa" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} placeholder="Opcional" /></div>
            <div className="space-y-1"><Label>Telefone</Label><Input data-testid="sign-telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-0000" /></div>
          </div>
          <Button type="submit" data-testid="btn-signup" disabled={busy} className="w-full h-11 bg-brand-cta hover:brightness-110 text-white border-0 shadow-md shadow-[#075BFF]/20">{busy ? "Criando..." : "Criar minha conta"}</Button>
          <div className="text-sm text-center text-slate-500">Já tem conta? <Link to="/login" className="font-semibold text-[#075BFF] hover:underline">Entrar</Link></div>
          <div className="text-[11px] text-center text-slate-400 leading-relaxed">Ao criar sua conta, você aceita nossos Termos de Uso e Política de Privacidade. Dados isolados por multi-tenancy.</div>
        </form>
      </div>
    </div>
  );
}