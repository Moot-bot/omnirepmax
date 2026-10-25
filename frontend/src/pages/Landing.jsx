import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, Users, Package, Sparkles, TrendingUp, 
  ArrowRight, CheckCircle2, PlayCircle, Database, 
  Bot, Zap, FileSpreadsheet, ShieldCheck, Percent,
  ChevronDown, Check, Lock, LayoutDashboard, Factory 
} from "lucide-react";

export default function Landing() {
  const [faqOpen, setFaqOpen] = useState(null);

  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 font-sans selection:bg-[#075BFF] selection:text-white overflow-x-hidden">
      
      {/* HEADER / NAVBAR */}
      <header className="fixed top-0 w-full z-50 bg-[#09090B]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            {/* LOGO AUMENTADA */}
            <img src="/logo.png" alt="OmniRepMax" className="h-14 sm:h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(8,213,245,0.3)]" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Como Funciona</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
            <a href="#faq" className="hover:text-white transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block"
            >
              Entrar
            </Link>
            <Link 
              to="/signup" 
              className="bg-white text-[#09090B] hover:bg-slate-200 font-semibold rounded-full px-6 py-2.5 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION - Futurista */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Grade de Fundo Tecnológica */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_40%,transparent_100%)] -z-20"></div>
        
        {/* Glows Neon */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#075BFF]/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[100px] -z-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(8,213,245,0.2)]">
            <Sparkles className="w-4 h-4 text-cyan-400" /> 
            O ERP definitivo para representantes comerciais
          </div>
          
          {/* TÍTULO COM GRADIENTE MAIS COLORIDO */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-8">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-500 drop-shadow-sm">
              A forma mais inteligente de
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-[#075BFF] to-fuchsia-500 drop-shadow-[0_0_30px_rgba(8,213,245,0.3)]">
              gerir suas comissões.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Chega de planilhas. Centralize suas fábricas, clientes e pedidos. 
            Deixe o OmniRepMax calcular suas comissões e controlar o fluxo de caixa enquanto você vende.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/signup" 
              className="w-full sm:w-auto bg-gradient-to-r from-[#075BFF] to-cyan-500 hover:from-blue-600 hover:to-cyan-400 text-white text-lg px-8 py-4 rounded-full font-bold shadow-[0_0_40px_-10px_rgba(8,213,245,0.6)] transition-all hover:scale-105 flex items-center justify-center border border-cyan-400/50"
            >
              Experimentar Grátis por 7 Dias <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link 
              to="/login" 
              className="w-full sm:w-auto border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white bg-slate-800/30 backdrop-blur-sm text-lg px-8 py-4 rounded-full flex items-center justify-center transition-all"
            >
              <PlayCircle className="mr-2 w-5 h-5" /> Ver o Sistema
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sem cartão de crédito</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancele quando quiser</div>
          </div>
        </div>

        {/* DASHBOARD MOCKUP */}
        <div className="relative max-w-5xl mx-auto px-6 mt-20">
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent z-10"></div>
          <div className="rounded-2xl border border-cyan-500/30 bg-[#1E293B]/50 backdrop-blur-xl p-2 shadow-[0_0_50px_-10px_rgba(8,213,245,0.3)] overflow-hidden relative">
            <div className="flex gap-2 p-3 border-b border-slate-700/50 bg-[#09090B]/50">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <div className="grid grid-cols-4 gap-4 p-6 bg-[#09090B]/80">
              <div className="col-span-1 border-r border-slate-800 pr-4 space-y-4">
                <div className="h-8 bg-slate-800 rounded-md w-full"></div>
                <div className="h-8 bg-slate-800 rounded-md w-full"></div>
                <div className="h-8 bg-slate-800 rounded-md w-full"></div>
              </div>
              <div className="col-span-3 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Comissões Previstas</div>
                    <div className="text-2xl font-bold text-white">R$ 14.250,00</div>
                  </div>
                  <div className="flex-1 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Faturamento Mês</div>
                    <div className="text-2xl font-bold text-emerald-400">R$ 285.000,00</div>
                  </div>
                </div>
                <div className="h-48 bg-slate-800/50 rounded-xl border border-slate-700 w-full flex items-end p-4 gap-2">
                  {[40, 70, 45, 90, 65, 100, 80, 50, 95, 60].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-[#075BFF] to-cyan-400 rounded-t-sm" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO GRID FEATURES */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tudo que você precisa em um só lugar</h2>
            <p className="text-slate-400 text-lg">Construído do zero para resolver os problemas reais de quem vive de representação comercial.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-slate-800 p-8 rounded-3xl relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#075BFF]/10 rounded-full blur-3xl group-hover:bg-[#075BFF]/20 transition-all"></div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Percent className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Gestão Inteligente de Comissões</h3>
              <p className="text-slate-400 mb-6 max-w-md">
                O valor do pedido pertence à fábrica. O seu lucro é a comissão. Configure regras de faturamento x liquidez e deixe o sistema calcular as parcelas exatas para você.
              </p>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
                <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Baixa Parcial</div>
                <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Múltiplas NFs</div>
              </div>
            </div>

            <div className="bg-[#1E293B] border border-slate-800 p-8 rounded-3xl relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Bot className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">MAX AI</h3>
              <p className="text-slate-400 text-sm">Seu analista comercial com IA. Pergunte sobre clientes inativos, produtos ou vendas e receba respostas em segundos.</p>
            </div>

            <div className="bg-[#1E293B] border border-slate-800 p-8 rounded-3xl group hover:border-cyan-500/50 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Database className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Importação de Dados</h3>
              <p className="text-slate-400 text-sm">Cansado de digitar? Importe catálogos de produtos via Excel/CSV e notas fiscais via XML em segundos.</p>
            </div>

            <div className="bg-[#1E293B] border border-slate-800 p-8 rounded-3xl group hover:border-cyan-500/50 transition-colors">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">CNPJ Automático</h3>
              <p className="text-slate-400 text-sm">Digite o CNPJ do cliente e o sistema preenche automaticamente razão social, endereço e contatos via BrasilAPI.</p>
            </div>

            {/* CARD SUBSTITUÍDO: Gestão Segura de Dados */}
            <div className="bg-[#1E293B] border border-slate-800 p-8 rounded-3xl group hover:border-cyan-500/50 transition-colors">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gestão Segura de Dados</h3>
              <p className="text-slate-400 text-sm">Seus dados estão criptografados e isolados por ambiente. Segurança de nível empresarial para o seu negócio.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-[#0C0C0E] border-y border-slate-800/50 relative overflow-hidden">
        {/* Glow sutil no fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-[#075BFF]/5 rounded-full blur-[100px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Comece a usar em 3 passos</h2>
            <p className="text-slate-400 text-lg">Sem instalação, sem burocracia.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -z-10 -translate-y-1/2"></div>

            {[
              { icon: Users, title: "1. Crie sua conta", desc: "Cadastre-se em menos de 1 minuto. Teste todos os recursos por 7 dias." },
              { icon: LayoutDashboard, title: "2. Configure sua operação", desc: "Cadastre suas fábricas, importe seus produtos e clientes." },
              { icon: TrendingUp, title: "3. Fature e receba", desc: "Lance pedidos, controle faturamentos e acompanhe suas comissões em tempo real." }
            ].map((step, i) => (
              <div key={i} className="bg-[#1E293B] border border-slate-800 p-8 rounded-3xl text-center relative z-10 hover:border-cyan-500/30 transition-colors">
                <div className="w-16 h-16 bg-[#09090B] border border-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(8,213,245,0.1)]">
                  <step.icon className="w-8 h-8 text-[#075BFF]" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Planos simples e transparentes</h2>
            <p className="text-slate-400 text-lg">Escolha o plano ideal para o tamanho da sua representação.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#1E293B] border border-slate-800 p-8 rounded-3xl flex flex-col hover:border-slate-600 transition-colors">
              <h3 className="text-xl font-bold mb-2">Solo</h3>
              <p className="text-slate-400 text-sm mb-6">Para quem está começando.</p>
              <div className="mb-6"><span className="text-4xl font-bold">R$ 69</span><span className="text-slate-400">/mês</span></div>
              <ul className="space-y-3 mb-8 flex-1 text-sm text-slate-300">
                <li className="flex gap-2"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Até 2 representadas</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Clientes e produtos ilimitados</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Funil Kanban</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Pedidos e comissões</li>
              </ul>
              <Link to="/signup" className="w-full bg-slate-800 hover:bg-slate-700 text-white text-center py-2.5 rounded-lg transition-colors border border-slate-700">Começar Teste</Link>
            </div>

            <div className="bg-gradient-to-b from-[#075BFF]/20 to-[#1E293B] border-2 border-[#075BFF] p-8 rounded-3xl flex flex-col relative transform md:-translate-y-4 shadow-[0_0_30px_-5px_rgba(7,91,255,0.4)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#075BFF] to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-lg">Mais Popular</div>
              <h3 className="text-xl font-bold mb-2">Profissional</h3>
              <p className="text-slate-400 text-sm mb-6">Para representações em crescimento.</p>
              <div className="mb-6"><span className="text-4xl font-bold text-white">R$ 99</span><span className="text-slate-400">/mês</span></div>
              <ul className="space-y-3 mb-8 flex-1 text-sm text-slate-300">
                <li className="flex gap-2"><Check className="w-5 h-5 text-cyan-400 shrink-0" /> Representadas ilimitadas</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-cyan-400 shrink-0" /> MAX AI ilimitado</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-cyan-400 shrink-0" /> Importação XML NF-e</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-cyan-400 shrink-0" /> Contas a pagar/receber</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-cyan-400 shrink-0" /> Até 5 usuários</li>
              </ul>
              <Link to="/signup" className="w-full bg-[#075BFF] hover:bg-blue-600 text-white font-bold text-center py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(7,91,255,0.5)] border border-cyan-400/30">Começar Teste</Link>
            </div>

            <div className="bg-[#1E293B] border border-slate-800 p-8 rounded-3xl flex flex-col hover:border-slate-600 transition-colors">
              <h3 className="text-xl font-bold mb-2">Equipe</h3>
              <p className="text-slate-400 text-sm mb-6">Para grandes operações.</p>
              <div className="mb-6"><span className="text-4xl font-bold">R$ 129</span><span className="text-slate-400">/mês</span></div>
              <ul className="space-y-3 mb-8 flex-1 text-sm text-slate-300">
                <li className="flex gap-2"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Tudo do Profissional</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Usuários ilimitados</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Perfis Admin/Financeiro</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Relatórios exportáveis</li>
                <li className="flex gap-2"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Suporte WhatsApp</li>
              </ul>
              <Link to="/signup" className="w-full bg-slate-800 hover:bg-slate-700 text-white text-center py-2.5 rounded-lg transition-colors border border-slate-700">Começar Teste</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-[#0C0C0E] border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Perguntas Frequentes</h2>
          </div>
          
          <div className="space-y-4">
            {[
              { q: "O OmniRepMax emite Nota Fiscal?", a: "Atualmente o sistema foca no controle de comissões e faturamento. Você pode registrar as NFs emitidas pela fábrica e controlar os recebimentos. A emissão de NFS-e está no roadmap para futuras atualizações." },
              { q: "Posso importar meus clientes atuais?", a: "Sim! Você pode usar a busca automática de CNPJ para cadastrar clientes em segundos, ou importar sua base via planilha." },
              { q: "Como funciona o controle de comissão?", a: "O sistema separa o valor total da venda (que pertence à fábrica) do valor da sua comissão (ex: 5%). Quando a fábrica fatura, o sistema cria as parcelas da sua comissão no Contas a Receber automaticamente." },
              { q: "Meus dados estão seguros?", a: "Absolutamente. Usamos criptografia de ponta a ponta e cada empresa tem um ambiente totalmente isolado (multi-tenant). Ninguém tem acesso aos seus dados além de você." }
            ].map((item, i) => (
              <div key={i} className="border border-slate-800 rounded-2xl overflow-hidden bg-[#1E293B] transition-colors hover:border-slate-600">
                <button 
                  onClick={() => toggleFaq(i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold hover:bg-slate-800/50 transition-colors"
                >
                  {item.q}
                  <ChevronDown className={`w-5 h-5 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && (
                  <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#075BFF]/5"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full bg-gradient-to-r from-[#075BFF]/20 to-fuchsia-500/20 blur-[100px]"></div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight drop-shadow-lg">Pronto para profissionalizar sua representação?</h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Junte-se a centenas de representantes que já economizam tempo e aumentam seus lucros com o OmniRepMax.
          </p>
          <Link 
            to="/signup" 
            className="bg-white text-[#09090B] hover:bg-slate-200 text-lg px-10 py-4 rounded-full font-bold shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-105 inline-block"
          >
            Criar Minha Conta Grátis
          </Link>
          <p className="mt-6 text-sm text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" /> Ambiente 100% seguro
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-12 bg-[#09090B]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {/* LOGO AUMENTADA NO FOOTER */}
              <img src="/logo.png" alt="OmniRepMax" className="h-12 w-auto object-contain" />
            </div>
            <p className="text-slate-400 text-sm max-w-xs">
              O sistema definitivo para gestão de representação comercial. Focado em comissões, faturamento e inteligência artificial.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Produto</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#features" className="hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Planos</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Dúvidas</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Suporte</a></li>
            </ul>
          </div>
        </div>
        
        {/* DIREITOS E DESENVOLVEDOR */}
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} OmniRepMax. Todos os direitos reservados.</p>
          <p className="font-semibold text-slate-400">
            Desenvolvido por <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#075BFF] to-cyan-400 hover:from-cyan-400 hover:to-[#075BFF] transition-all cursor-pointer">NORTMARKAS SOLUÇÕES TECNOLÓGICAS</span>
          </p>
        </div>
      </footer>
    </div>
  );
}