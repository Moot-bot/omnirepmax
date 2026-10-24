import React from "react";
import { Link } from "react-router-dom";
import { 
  Building2, Users, Package, Sparkles, TrendingUp, 
  ArrowRight, CheckCircle2, PlayCircle, Database, 
  Bot, Zap, FileSpreadsheet, ShieldCheck
} from "lucide-react";
import { Button } from "../components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-[#075BFF] selection:text-white">
      
      {/* HEADER / NAVBAR */}
      <header className="fixed top-0 w-full z-50 bg-[#0F172A]/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* LOGO FLUTUANDO (animate-float) */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#075BFF] to-cyan-400 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30 animate-float">O</div>
            <span className="font-extrabold text-2xl tracking-tight text-white">
              OMNIREP<span className="text-[#075BFF]">MAX</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#ia" className="hover:text-white transition-colors">Inteligência Artificial</a>
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos & Preços</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
              Entrar
            </Link>
            <Link to="/signup">
              <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-600/30 rounded-full px-6 transition-transform hover:scale-105">
                Experimentar Grátis!
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-36 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Efeitos de Fundo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-[#0F172A] to-[#0F172A]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#075BFF]/10 rounded-full blur-[120px]"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> O Futuro da Representação Comercial
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
              Venda mais, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#075BFF] to-cyan-400">
                controle suas comissões
              </span> <br />
              e deixe a IA trabalhar.
            </h1>
            
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              O único sistema feito sob medida para representantes. Cadastre fábricas, clientes e produtos. 
              O OmniRepMax calcula suas comissões, gerencia recebimentos parcelados e ainda conta com um assistente de IA (MAX AI) para analisar seu negócio.
            </p>

            {/* BOTÕES COM SELO 7 DIAS GRÁTIS */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
              <Link to="/signup" className="w-full sm:w-auto relative">
                <span className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse shadow-lg z-10">
                  7 DIAS GRÁTIS
                </span>
                <Button size="lg" className="w-full sm:w-auto bg-[#075BFF] hover:bg-blue-600 text-white text-lg px-8 py-6 rounded-xl shadow-xl shadow-blue-600/20 group">
                  Começar Teste Grátis 
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-700 text-slate-300 hover:bg-slate-800 text-lg px-8 py-6 rounded-xl">
                  <PlayCircle className="mr-2 w-5 h-5" /> Acessar Painel
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-6 pt-4 text-sm text-slate-500">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 7 dias grátis</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sem fidelidade</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Suporte humanizado</div>
            </div>
          </div>

          {/* Mockup do Dashboard Fake */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#075BFF] to-cyan-400 rounded-3xl blur-3xl opacity-20"></div>
            <div className="relative bg-[#1E293B] border border-slate-700 rounded-2xl p-4 shadow-2xl">
              <div className="flex gap-2 mb-4 px-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-[#0F172A] p-3 rounded-lg border border-slate-800">
                   <div className="flex items-center gap-3">
                      <Bot className="text-cyan-400 w-6 h-6" />
                      <div className="text-xs text-slate-300">"Qual minha comissão a receber da Bella Moda?"</div>
                   </div>
                   <div className="text-xs font-bold text-emerald-400">R$ 12.400</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-28 bg-[#0F172A] rounded-xl border border-slate-800 p-3 flex flex-col justify-between">
                    <div className="text-xs text-slate-500">Faturamento Mês</div>
                    <div className="text-xl font-bold text-white">R$ 145.000</div>
                  </div>
                  <div className="h-28 bg-[#0F172A] rounded-xl border border-slate-800 p-3 flex flex-col justify-between">
                    <div className="text-xs text-slate-500">Comissões Pendentes</div>
                    <div className="text-xl font-bold text-amber-500">R$ 8.250</div>
                  </div>
                </div>
                <div className="h-32 bg-[#0F172A] rounded-xl border border-slate-800 w-full flex items-end justify-between p-4 gap-2">
                   {[40, 70, 45, 90, 65, 100, 80].map((h, i) => (
                      <div key={i} className="w-full bg-[#075BFF] rounded-t-sm" style={{ height: `${h}%` }}></div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE IA E AUTOMAÇÃO */}
      <section id="ia" className="py-24 bg-[#0B1120] border-y border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Deixe a tecnologia fazer o <span className="text-cyan-400">trabalho duro</span>
            </h2>
            <p className="text-slate-400">
              Esqueça digitação manual. O OmniRepMax usa inteligência artificial e integrações para preencher dados e gerar insights para você.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1: Busca CNPJ */}
            <div className="bg-[#1E293B] border border-slate-700 p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full"></div>
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                <Database className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Preenchimento Automático de CNPJ</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Digite apenas o CNPJ e o sistema busca automaticamente na Receita Federal a Razão Social, Endereço, Telefone e E-mail. Cadastre um cliente em 5 segundos.
              </p>
              <div className="bg-[#0F172A] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300 font-mono">Integração via BrasilAPI</span>
              </div>
            </div>

            {/* Feature 2: MAX AI */}
            <div className="bg-[#1E293B] border border-slate-700 p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-full"></div>
              <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-6">
                <Bot className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">MAX AI: Seu Analista Comercial</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Converse com o sistema. Pergunte "quem são meus clientes inativos?" ou "qual produto vendeu menos este mês?" e receba respostas instantâneas baseadas nos seus dados.
              </p>
              <div className="bg-[#0F172A] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-300 font-mono">Processamento via Groq (Llama 3)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES (REPRESENTADAS, CLIENTES, COMISSÕES) */}
      <section id="funcionalidades" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            
            <div className="bg-[#1E293B] border border-slate-800 p-8 rounded-2xl">
              <Building2 className="w-10 h-10 text-[#075BFF] mb-6" />
              <h3 className="text-xl font-bold mb-3">Gestão de Fábricas</h3>
              <p className="text-sm text-slate-400 mb-6">
                Cadastre indústrias, controle contratos em PDF, tabelas de preço e defina a regra de comissão (no faturamento ou na liquidez).
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#075BFF]" /> Importação de Catálogo TXT</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#075BFF]" /> Upload de Logo</li>
              </ul>
            </div>

            <div className="bg-[#1E293B] border border-slate-800 p-8 rounded-2xl">
              <FileSpreadsheet className="w-10 h-10 text-cyan-400 mb-6" />
              <h3 className="text-xl font-bold mb-3">Controle de Comissões</h3>
              <p className="text-sm text-slate-400 mb-6">
                O valor do pedido é da fábrica. O seu lucro é a comissão. O sistema gera automaticamente as parcelas do seu recebimento e controla as baixas.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Recebimentos Parciais</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Painel por Representada</li>
              </ul>
            </div>

            <div className="bg-[#1E293B] border border-slate-800 p-8 rounded-2xl">
              <TrendingUp className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-xl font-bold mb-3">Gestão Financeira</h3>
              <p className="text-sm text-slate-400 mb-6">
                Saiba exatamente quanto você tem a receber de cada fábrica. Controle contas a pagar, fluxo de caixa e a saúde financeira do seu negócio.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Relatórios em Tempo Real</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Alerta de Vencimentos</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* CTA FINAL (CHAMADA PARA AÇÃO) */}
      <section className="py-24 relative overflow-hidden border-t border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-t from-[#075BFF]/20 to-transparent"></div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <ShieldCheck className="w-16 h-16 text-[#075BFF] mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6 text-white">Pronto para transformar sua representação?</h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Junte-se aos representantes que já abandonaram as planilhas e estão vendendo mais com o OmniRepMax. Comece seu teste de 7 dias agora.
          </p>
          <Link to="/signup">
            <Button className="bg-red-600 hover:bg-red-700 text-white text-lg px-10 py-7 rounded-full font-bold shadow-xl shadow-red-600/30 transition-transform hover:scale-105">
              Criar minha conta grátis
            </Button>
          </Link>
          <p className="mt-6 text-sm text-slate-500">Não pedimos cartão de crédito.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-8 bg-[#0B1120]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#075BFF] flex items-center justify-center text-white font-bold text-xs">O</div>
            <span className="font-bold text-slate-300">OMNIREPMAX</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 OmniRepMax. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-sm text-slate-400">
            <a href="#" className="hover:text-white">Termos</a>
            <a href="#" className="hover:text-white">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}