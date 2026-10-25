import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { 
  Building2, Users, Package, Sparkles, TrendingUp, 
  ArrowRight, CheckCircle2, PlayCircle, Database, 
  Bot, Zap, FileSpreadsheet, ShieldCheck, Percent,
  ChevronDown, Check, Lock, LayoutDashboard, Factory,
  BarChart3, Bell, Search, Menu, ArrowUpRight, Settings,
  Sun, Moon
} from "lucide-react";

export default function Landing() {
  const [faqOpen, setFaqOpen] = useState(null);
  const { theme, toggleTheme } = useTheme();

  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090B] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#075BFF] selection:text-white overflow-x-hidden transition-colors duration-300">
      
      {/* HEADER / NAVBAR */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#09090B]/60 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <img src="/logo.png" alt="OmniRepMax" className="h-12 sm:h-14 w-auto object-contain dark:drop-shadow-[0_0_15px_rgba(8,213,245,0.3)] transition-transform hover:scale-105" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Funcionalidades</a>
            <a href="#how-it-works" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Como Funciona</a>
            <a href="#pricing" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Planos</a>
            <a href="#faq" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors hidden sm:block">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link 
              to="/login" 
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-[#075BFF] dark:hover:text-white transition-colors hidden sm:block px-2"
            >
              Entrar
            </Link>
            <Link 
              to="/signup" 
              className="bg-[#075BFF] text-white hover:bg-blue-600 font-bold rounded-full px-6 py-2.5 transition-all shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:-translate-y-0.5"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Efeitos de Fundo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] -z-20 transition-colors duration-300"></div>
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#075BFF]/10 dark:bg-[#075BFF]/20 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[100px] -z-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[#075BFF] dark:text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-8 backdrop-blur-md shadow-sm dark:shadow-[0_0_20px_rgba(8,213,245,0.1)]">
            <Sparkles className="w-4 h-4" /> 
            A evolução da representação comercial
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-8">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400">
              O ERP definitivo para
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#075BFF] via-cyan-500 to-[#08D5F5] dark:from-[#075BFF] dark:via-cyan-400 dark:to-[#08D5F5] drop-shadow-sm dark:drop-shadow-[0_0_30px_rgba(8,213,245,0.3)]">
              gestão de comissões.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Centralize suas fábricas, clientes e pedidos. Deixe o OmniRepMax calcular suas comissões, gerir o faturamento e controlar seu fluxo de caixa com precisão cirúrgica.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/signup" 
              className="w-full sm:w-auto bg-gradient-to-r from-[#075BFF] to-[#08D5F5] hover:from-blue-600 hover:to-cyan-400 text-white text-lg px-8 py-4 rounded-full font-bold shadow-lg dark:shadow-[0_10px_40px_-10px_rgba(8,213,245,0.6)] transition-all hover:scale-105 flex items-center justify-center border border-cyan-400/30"
            >
              Começar Teste Grátis <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link 
              to="/login" 
              className="w-full sm:w-auto border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 text-slate-700 dark:text-slate-300 hover:text-[#075BFF] dark:hover:text-white bg-white dark:bg-white/5 backdrop-blur-sm text-lg px-8 py-4 rounded-full flex items-center justify-center transition-all shadow-sm hover:bg-slate-50 dark:hover:bg-white/10"
            >
              <PlayCircle className="mr-2 w-5 h-5" /> Ver Demonstração
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 mt-10 text-sm font-medium text-slate-500 dark:text-slate-500">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sem cartão de crédito</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Setup em 2 minutos</div>
          </div>
        </div>

        {/* MOCKUP DO SISTEMA SUPER REALISTA */}
        <div className="relative max-w-6xl mx-auto px-6 mt-24">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-50 dark:from-[#09090B] to-transparent z-20"></div>
          
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B]/40 backdrop-blur-2xl p-2 shadow-xl dark:shadow-[0_0_80px_-20px_rgba(8,213,245,0.4)] relative z-10 overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
            {/* Top Bar do Navegador */}
            <div className="flex gap-2 p-3 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#09090B]/60 rounded-t-xl">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white dark:bg-white/5 rounded-md px-4 py-0.5 text-[10px] text-slate-400 flex items-center gap-2 border border-slate-200 dark:border-transparent">
                  <Lock className="w-2.5 h-2.5" /> app.omnirepmax.com.br
                </div>
              </div>
            </div>

            {/* Interface do Sistema */}
            <div className="flex h-[500px] bg-slate-50 dark:bg-[#09090B]/90">
              {/* Sidebar Mockup */}
              <div className="w-56 border-r border-slate-200 dark:border-white/5 p-4 flex flex-col gap-6">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-6 h-6 rounded bg-[#075BFF]"></div>
                  <div className="w-20 h-3 bg-slate-200 dark:bg-white/10 rounded"></div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`flex items-center gap-3 px-2 py-2 rounded-lg ${i === 1 ? 'bg-[#075BFF]/10 dark:bg-[#075BFF]/20' : ''}`}>
                      <div className={`w-4 h-4 rounded ${i === 1 ? 'bg-[#075BFF]' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                      <div className={`h-2.5 rounded ${i === 1 ? 'w-20 bg-[#075BFF]/50' : 'w-16 bg-slate-200 dark:bg-white/10'}`}></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Mockup */}
              <div className="flex-1 p-6 flex flex-col gap-6">
                {/* Header Mockup */}
                <div className="flex justify-between items-center">
                  <div className="w-48 h-6 bg-slate-200 dark:bg-white/10 rounded"></div>
                  <div className="flex gap-3">
                    <div className="w-32 h-8 bg-white dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 flex items-center px-3 gap-2 shadow-sm"></div>
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm"></div>
                  </div>
                </div>

                {/* Cards Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-xl shadow-sm">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Volume de Vendas</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">R$ 285.400</div>
                  </div>
                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-xl shadow-sm">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Comissões Previstas</div>
                    <div className="text-xl font-bold text-[#075BFF] dark:text-[#08D5F5]">R$ 14.250</div>
                  </div>
                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-xl shadow-sm">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">A Receber</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">R$ 8.400</div>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-32 h-3 bg-slate-200 dark:bg-white/10 rounded"></div>
                    <div className="w-16 h-4 bg-slate-50 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10"></div>
                  </div>
                  <div className="flex-1 flex items-end gap-2">
                    {[30, 50, 40, 70, 60, 90, 80, 100, 85, 95, 70, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-[#075BFF]/50 to-[#08D5F5] rounded-t-sm" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / LOGOS */}
      <section className="py-10 border-y border-slate-200 dark:border-white/5 bg-white dark:bg-[#0C0C0E] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">
            Utilizado por representantes das maiores indústrias do país
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-white"><Factory className="w-6 h-6" /> Indústria Alfa</div>
            <div className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-white"><Building2 className="w-6 h-6" /> Grupo Beta</div>
            <div className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-white"><Package className="w-6 h-6" /> Distribuidora Gama</div>
            <div className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-white"><TrendingUp className="w-6 h-6" /> Delta Corp</div>
            <div className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-white"><ShieldCheck className="w-6 h-6" /> Omega S.A.</div>
          </div>
        </div>
      </section>

      {/* BENTO GRID FEATURES */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-slate-900 dark:text-white">Tudo que você precisa <br/> em um só lugar</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Construído do zero para resolver os problemas reais de quem vive de representação comercial.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 - Big */}
            <div className="md:col-span-2 bg-white dark:bg-gradient-to-br dark:from-[#1E293B] dark:to-[#0F172A] border border-slate-200 dark:border-white/10 p-8 rounded-3xl relative overflow-hidden group hover:border-[#075BFF]/50 transition-all duration-300 shadow-sm">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#075BFF]/5 dark:bg-[#075BFF]/10 rounded-full blur-3xl group-hover:bg-[#075BFF]/10 dark:group-hover:bg-[#075BFF]/20 transition-all"></div>
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-sm dark:shadow-[0_0_20px_rgba(7,91,255,0.3)]">
                <Percent className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">Gestão Cirúrgica de Comissões</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md text-lg">
                O valor do pedido pertence à fábrica. O seu lucro é a comissão. Configure regras de faturamento x liquidez e deixe o sistema calcular as parcelas exatas para você.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Baixa Parcial</div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Múltiplas NFs</div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Regras de Liquidez</div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 p-8 rounded-3xl relative overflow-hidden group hover:border-[#08D5F5]/50 transition-all duration-300 shadow-sm">
              <div className="w-14 h-14 bg-cyan-100 dark:bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-sm dark:shadow-[0_0_20px_rgba(8,213,245,0.3)]">
                <Bot className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">MAX AI</h3>
              <p className="text-slate-600 dark:text-slate-400">Seu analista comercial com IA. Pergunte sobre clientes inativos, produtos ou vendas e receba respostas em segundos.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 p-8 rounded-3xl group hover:border-emerald-500/50 transition-all duration-300 shadow-sm">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-sm dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Database className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Importação de Dados</h3>
              <p className="text-slate-600 dark:text-slate-400">Cansado de digitar? Importe catálogos de produtos via Excel/CSV e notas fiscais via XML em segundos.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 p-8 rounded-3xl group hover:border-amber-500/50 transition-all duration-300 shadow-sm">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-sm dark:shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Zap className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">CNPJ Automático</h3>
              <p className="text-slate-600 dark:text-slate-400">Digite o CNPJ do cliente e o sistema preenche automaticamente razão social, endereço e contatos via BrasilAPI.</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 p-8 rounded-3xl group hover:border-purple-500/50 transition-all duration-300 shadow-sm">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-sm dark:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                <ShieldCheck className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Gestão Segura de Dados</h3>
              <p className="text-slate-600 dark:text-slate-400">Seus dados estão criptografados e isolados por ambiente. Segurança de nível empresarial para o seu negócio.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-white dark:bg-[#0C0C0E] border-y border-slate-200 dark:border-white/5 relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-[#075BFF]/5 dark:bg-[#075BFF]/10 rounded-full blur-[120px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-white">Comece a usar em 3 passos</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Sem instalação, sem burocracia. Pronto para rodar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-[#075BFF]/30 dark:via-[#075BFF]/50 to-transparent -z-10"></div>

            {[
              { icon: Users, title: "1. Crie sua conta", desc: "Cadastre-se em menos de 1 minuto. Teste todos os recursos por 7 dias sem pagar nada." },
              { icon: LayoutDashboard, title: "2. Configure sua operação", desc: "Cadastre suas fábricas, importe seus produtos e clientes de forma super rápida." },
              { icon: TrendingUp, title: "3. Fature e receba", desc: "Lance pedidos, controle faturamentos e acompanhe suas comissões caindo em tempo real." }
            ].map((step, i) => (
              <div key={i} className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 p-8 rounded-3xl text-center relative z-10 hover:border-[#075BFF]/50 hover:-translate-y-1 transition-all duration-300 shadow-sm dark:shadow-xl">
                <div className="w-20 h-20 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md dark:shadow-[0_0_30px_rgba(8,213,245,0.15)]">
                  <step.icon className="w-9 h-9 text-[#075BFF]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-white">Planos simples e transparentes</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Escolha o plano ideal para o tamanho da sua representação.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Plan 1 */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 p-8 rounded-3xl flex flex-col hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 shadow-sm">
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Solo</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">Para quem está começando.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-slate-900 dark:text-white">R$ 69</span>
                <span className="text-slate-500 dark:text-slate-400">/mês</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Até 2 representadas</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Clientes e produtos ilimitados</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Funil Kanban</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Pedidos e comissões</li>
              </ul>
              <Link to="/signup" className="w-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white text-center py-3 rounded-xl transition-colors border border-slate-200 dark:border-white/10 font-semibold">Começar Teste</Link>
            </div>

            {/* Plan 2 - Featured */}
            <div className="bg-gradient-to-b from-[#075BFF]/10 to-white dark:from-[#075BFF]/20 dark:to-[#1E293B] border-2 border-[#075BFF] p-8 rounded-3xl flex flex-col relative transform md:-translate-y-4 shadow-lg dark:shadow-[0_0_50px_-10px_rgba(7,91,255,0.5)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#075BFF] to-cyan-500 text-white text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">Mais Popular</div>
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Profissional</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">Para representações em crescimento.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-slate-900 dark:text-white">R$ 99</span>
                <span className="text-slate-600 dark:text-slate-300">/mês</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-700 dark:text-slate-200">
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-[#075BFF] dark:text-cyan-400 shrink-0" /> Representadas ilimitadas</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-[#075BFF] dark:text-cyan-400 shrink-0" /> MAX AI ilimitado</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-[#075BFF] dark:text-cyan-400 shrink-0" /> Importação XML NF-e</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-[#075BFF] dark:text-cyan-400 shrink-0" /> Contas a pagar/receber</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-[#075BFF] dark:text-cyan-400 shrink-0" /> Até 5 usuários</li>
              </ul>
              <Link to="/signup" className="w-full bg-[#075BFF] hover:bg-blue-600 text-white font-bold text-center py-3 rounded-xl transition-all shadow-md dark:shadow-[0_0_20px_rgba(7,91,255,0.6)] hover:scale-105">Começar Teste</Link>
            </div>

            {/* Plan 3 */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 p-8 rounded-3xl flex flex-col hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 shadow-sm">
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Equipe</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">Para grandes operações.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-slate-900 dark:text-white">R$ 129</span>
                <span className="text-slate-500 dark:text-slate-400">/mês</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Tudo do Profissional</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Usuários ilimitados</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Perfis Admin/Financeiro</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Relatórios exportáveis</li>
                <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Suporte WhatsApp</li>
              </ul>
              <Link to="/signup" className="w-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white text-center py-3 rounded-xl transition-colors border border-slate-200 dark:border-white/10 font-semibold">Começar Teste</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-white dark:bg-[#0C0C0E] border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Perguntas Frequentes</h2>
          </div>
          
          <div className="space-y-3">
            {[
              { q: "O OmniRepMax emite Nota Fiscal?", a: "Atualmente o sistema foca no controle de comissões e faturamento. Você pode registrar as NFs emitidas pela fábrica e controlar os recebimentos. A emissão de NFS-e está no roadmap para futuras atualizações." },
              { q: "Posso importar meus clientes atuais?", a: "Sim! Você pode usar a busca automática de CNPJ para cadastrar clientes em segundos, ou importar sua base via planilha." },
              { q: "Como funciona o controle de comissão?", a: "O sistema separa o valor total da venda (que pertence à fábrica) do valor da sua comissão (ex: 5%). Quando a fábrica fatura, o sistema cria as parcelas da sua comissão no Contas a Receber automaticamente." },
              { q: "Meus dados estão seguros?", a: "Absolutamente. Usamos criptografia de ponta a ponta e cada empresa tem um ambiente totalmente isolado (multi-tenant). Ninguém tem acesso aos seus dados além de você." }
            ].map((item, i) => (
              <div key={i} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#1E293B] transition-all hover:border-slate-300 dark:hover:border-white/20">
                <button 
                  onClick={() => toggleFaq(i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-slate-900 dark:text-white transition-colors"
                >
                  {item.q}
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`px-6 text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-200 dark:border-white/5 transition-all duration-300 overflow-hidden ${faqOpen === i ? 'max-h-40 py-4 opacity-100' : 'max-h-0 py-0 opacity-0 border-transparent'}`}>
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 relative overflow-hidden bg-slate-50 dark:bg-transparent">
        <div className="absolute inset-0 bg-[#075BFF]/5"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-gradient-to-r from-[#075BFF]/10 dark:from-[#075BFF]/30 to-fuchsia-500/10 dark:to-fuchsia-500/30 blur-[120px]"></div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 text-slate-900 dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-lg">Pronto para o próximo nível?</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto text-xl">
            Junte-se a centenas de representantes que já economizam tempo e aumentam seus lucros com o OmniRepMax.
          </p>
          <Link 
            to="/signup" 
            className="bg-[#075BFF] dark:bg-white text-white dark:text-[#09090B] hover:bg-blue-600 dark:hover:bg-slate-200 text-lg px-12 py-5 rounded-full font-bold shadow-lg dark:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all hover:scale-105 inline-flex items-center gap-2"
          >
            Criar Minha Conta Grátis <ArrowUpRight className="w-5 h-5" />
          </Link>
          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 font-medium">
            <Lock className="w-4 h-4" /> Ambiente 100% seguro e criptografado
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-white/10 py-12 bg-white dark:bg-[#09090B] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.png" alt="OmniRepMax" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed">
              O sistema definitivo para gestão de representação comercial. Focado em comissões, faturamento e inteligência artificial.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Produto</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><a href="#features" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#pricing" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Planos</a></li>
              <li><a href="#faq" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Dúvidas</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><a href="#" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-[#075BFF] dark:hover:text-white transition-colors">Suporte</a></li>
            </ul>
          </div>
        </div>
        
        {/* DIREITOS E DESENVOLVEDOR */}
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} OmniRepMax. Todos os direitos reservados.</p>
          <p className="font-medium text-slate-500 dark:text-slate-400">
            Desenvolvido por <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#075BFF] to-cyan-400 hover:from-cyan-400 hover:to-[#075BFF] transition-all cursor-pointer">NORTMARKAS SOLUÇÕES TECNOLÓGICAS</span>
          </p>
        </div>
      </footer>
    </div>
  );
}