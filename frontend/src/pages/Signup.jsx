import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Check } from "lucide-react";
import Logo from "../components/Logo";

export default function Signup() {
  const { user, loading } = useAuth();
  // ✅ NOVOS CAMPOS ADICIONADOS AO ESTADO
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
    <div className="min-h-screen grid lg:grid-cols-5 !bg-slate-50">
      
      {/* Lado Esquerdo Escuro */}
      <div
        className="hidden lg:flex lg:col-span-2 flex-col justify-between p-10 !text-white relative overflow-hidden"
        style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(7,91,255,0.28) 0, transparent 45%), radial-gradient(circle at 85% 85%, rgba(8,213,245,0.22) 0, transparent 48%), linear-gradient(135deg, #061329 0%, #0A1F46 55%, #0B2F70 100%)" }}
      >
        <div className="relative">
          <Logo variant="wordmark" size={38} onDark />
        </div>
        <div className="relative space-y-6">
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight">Comece agora. <span className="text-[#22D3EE]">7 dias grátis.</span></h1>
          <ul className="space-y-3 text-sm">
            {["CRM com clientes e prospects ilimitados", "Pedidos com cálculo automático de comissão", "Funil Kanban drag-and-drop", "MAX AI em linguagem natural", "Importação de XML NF-e", "Insights comerciais inteligentes", "Dashboard financeiro completo", "App instalável no celular (PWA)"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-[#22D3EE]" />{f}</li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs !text-slate-400">Sem cartão de crédito. Cancele quando quiser.</div>
      </div>

      {/* Lado Direito (Formulário) */}
      <div className="lg:col-span-3 flex items-center justify-center p-6 sm:p-10 !bg-white">
        <form onSubmit={submit} className="w-full max-w-lg space-y-6">
          <div>
            <h2 className="text-3xl font-extrabold !text-slate-900">Criar conta grátis</h2>
            <p className="text-sm !text-slate-500 mt-1">Comece a usar o OMNIREP MAX em 60 segundos.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-semibold !text-slate-700">Nome completo *</label>
              <input 
                type="text" required placeholder="Seu nome completo" autoComplete="name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg !text-slate-900 !bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]" 
              />
            </div>
            
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-semibold !text-slate-700">E-mail *</label>
              <input 
                type="email" required placeholder="seu@email.com" autoComplete="email"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg !text-slate-900 !bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]" 
              />
            </div>
            
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-semibold !text-slate-700">Senha * (mín. 8 caracteres)</label>
              <input 
                type="password" required placeholder="********" autoComplete="new-password"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg !text-slate-900 !bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold !text-slate-700">Empresa / Escritório</label>
              <input 
                type="text" placeholder="Opcional" autoComplete="organization"
                value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg !text-slate-900 !bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold !text-slate-700">Telefone</label>
              <input 
                type="tel" placeholder="(11) 99999-0000" autoComplete="tel"
                value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg !text-slate-900 !bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]" 
              />
            </div>

            {/* ✅ NOVAS PERGUNTAS DE QUALIFICAÇÃO */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-semibold !text-slate-700">Qual o tamanho da sua operação?</label>
              <select 
                value={form.tamanho_operacao} 
                onChange={(e) => setForm({ ...form, tamanho_operacao: e.target.value })}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg !text-slate-900 !bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]"
              >
                <option value="solo">Sou Representante Solo</option>
                <option value="pequena">Equipe Pequena (2 a 5 pessoas)</option>
                <option value="grande">Equipe Grande (Mais de 5 pessoas)</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-semibold !text-slate-700">Como você controla suas comissões hoje?</label>
              <select 
                value={form.controle_atual} 
                onChange={(e) => setForm({ ...form, controle_atual: e.target.value })}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg !text-slate-900 !bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]"
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
            className="w-full h-11 !bg-[#075BFF] hover:!bg-blue-600 !text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {busy ? "Criando..." : "Criar minha conta"}
          </button>
          
          <div className="text-sm text-center !text-slate-500">
            Já tem conta? <Link to="/login" className="font-semibold !text-[#075BFF] hover:underline">Entrar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}