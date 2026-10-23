import React from "react";
import { Link } from "react-router-dom";
import { 
  BarChart3, Users, Building2, Package, Sparkles, 
  TrendingUp, ShieldCheck, ArrowRight, CheckCircle2, PlayCircle 
} from "lucide-react";
import { Button } from "../components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#075BFF] selection:text-white">
      
      {/* HEADER / NAVBAR */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#075BFF] flex items-center justify-center text-white font-bold text-xl">O</div>
            <span className="font-bold text-xl tracking-tight text-white">
              OMNIREP<span className="text-[#075BFF]">MAX</span>
            </span>
          </div>

          {/* Links de Navegação */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#solucoes" className="hover:text-white transition-colors">Soluções</a>
            <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos & Preços</a>
            <a href="#sobre" className="hover:text-white transition-colors">Sobre</a>
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
              Entrar
            </Link>
            <Link to="/signup">
              <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-600/20">
                Experimentar Grátis!
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Fundo com Gradiente e Efeito de Grade */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#075BFF]/20 via-slate-950 to-slate-950"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#075BFF]/10 border border-[#075BFF]/30 text-[#075BFF] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Plataforma Referência em Representação
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
              Toda a gestão da sua <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#075BFF] to-cyan-400">
                Representação Comercial
              </span> <br />
              num único lugar.
            </h1>
            
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              CRM, Força de Vendas, Controle de Comissões Parceladas, Financeiro e IA. 
              Feito exclusivamente para Representantes Comerciais, Distribuidoras e Indústrias.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 rounded-xl shadow-xl shadow-red-600/20">
                  Começar Teste Grátis <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-700 text-slate-300 hover:bg-slate-800 text-lg px-8 py-6 rounded-xl">
                  <PlayCircle className="mr-2 w-5 h-5" /> Ver Demonstração
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-6 pt-6 text-sm text-slate-500">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sem cartão de crédito</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Suporte humanizado</div>
            </div>
          </div>

          {/* Mockup / Ilustração Lateral */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#075BFF] to-cyan-400 rounded-3xl blur-3xl opacity-20"></div>
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl">
              {/* Barra do navegador fake */}
              <div className="flex gap-2 mb-4 px-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              {/* Conteúdo fake do Dashboard */}
              <div className="space-y-4">
                <div className="h-8 bg-slate-800 rounded-md w-1/3"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 bg-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="h-3 w-12 bg-slate-700 rounded"></div>
                    <div className="h-6 w-24 bg-emerald-500/20 text-emerald-500 rounded font-mono flex items-center px-2 text-xs">R$ 45.000</div>
                  </div>
                  <div className="h-24 bg-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="h-3 w-12 bg-slate-700 rounded"></div>
                    <div className="h-6 w-24 bg-amber-500/20 text-amber-500 rounded font-mono flex items-center px-2 text-xs">R$ 12.500</div>
                  </div>
                  <div className="h-24 bg-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="h-3 w-12 bg-slate-700 rounded"></div>
                    <div className="h-6 w-24 bg-slate-700 rounded"></div>
                  </div>
                </div>
                <div className="h-48 bg-slate-800 rounded-xl w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE MÓDULOS (Os 3 pilares pedidos) */}
      <section id="modulos" className="py-24 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Um software eficiente para a sua operação</h2>
            <p className="text-slate-400">Cadastre suas fábricas, gerencie seus clientes e controle seu catálogo de produtos com a máxima inteligência do mercado.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Módulo 1 */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-[#075BFF]/50 transition-colors group">
              <div className="w-14 h-14 bg-[#075BFF]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7 text-[#075BFF]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gestão de Representadas</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Cadastre indústrias e fábricas, defina o percentual de comissão e a modalidade de pagamento (Faturamento ou Liquidez). Controle contratos e aditivos.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Upload de contratos (PDF)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Consulta automática de CNPJ</li>
              </ul>
            </div>

            {/* Módulo 2 */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-cyan-500/50 transition-colors group">
              <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Clientes CRM</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Tenha o histórico completo de compras, interações e representadas vinculadas a cada cliente. Mantenha sua carteira sempre ativa.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Preenchimento via CNPJ/CPF</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Geolocalização e segmentação</li>
              </ul>
            </div>

            {/* Módulo 3 */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Package className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Catálogo de Produtos</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Cada representada possui seu próprio catálogo de produtos. Faça importação em massa via arquivo TXT e monte pedidos em segundos.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Importação inteligente de TXT</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tabelas de preço isoladas</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE BENEFÍCIOS (Comissões e Financeiro) */}
      <section id="solucoes" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Controle exato das suas <span className="text-[#075BFF]">Comissões</span></h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Chega de planilhas confusas. O OmniRepMax separa o que é o valor do pedido (da fábrica) do que é o seu dinheiro. Ao faturar um pedido, o sistema gera automaticamente as parcelas de comissão que você tem a receber.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 bg-amber-500/20 p-2 rounded-lg h-fit"><TrendingUp className="w-5 h-5 text-amber-500" /></div>
                  <div>
                    <h4 className="font-bold text-lg">Baixa Parcial e Histórico</h4>
                    <p className="text-sm text-slate-400">Recebeu apenas metade da comissão? Dê baixa parcial e o sistema calcula o saldo devedor restante automaticamente.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 bg-cyan-500/20 p-2 rounded-lg h-fit"><BarChart3 className="w-5 h-5 text-cyan-400" /></div>
                  <div>
                    <h4 className="font-bold text-lg">Faturamento x Liquidez</h4>
                    <p className="text-sm text-slate-400">Defina se a comissão é paga no faturamento da NF ou somente quando o cliente pagar a fábrica (liquidez).</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 bg-emerald-500/20 p-2 rounded-lg h-fit"><ShieldCheck className="w-5 h-5 text-emerald-500" /></div>
                  <div>
                    <h4 className="font-bold text-lg">Dashboards Poderosos</h4>
                    <p className="text-sm text-slate-400">Saiba exatamente quanto cada representada te deve, quem são seus melhores clientes e a saúde financeira do negócio.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Caixa flutuante de Estatísticas */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#075BFF] to-purple-600 rounded-3xl blur-3xl opacity-20"></div>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl relative z-10 grid grid-cols-2 gap-6">
                 <div className="text-center p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                   <div className="text-3xl font-bold text-white mb-1">+4.000</div>
                   <div className="text-xs text-slate-400 uppercase tracking-wide">Empresas Atendidas</div>
                 </div>
                 <div className="text-center p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                   <div className="text-3xl font-bold text-white mb-1">+38k</div>
                   <div className="text-xs text-slate-400 uppercase tracking-wide">Usuários Ativos</div>
                 </div>
                 <div className="text-center p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                   <div className="text-3xl font-bold text-white mb-1">R$ 2B+</div>
                   <div className="text-xs text-slate-400 uppercase tracking-wide">Em Vendas Processadas</div>
                 </div>
                 <div className="text-center p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                   <div className="text-3xl font-bold text-white mb-1">99.9%</div>
                   <div className="text-xs text-slate-400 uppercase tracking-wide">Uptime Garantido</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#075BFF] flex items-center justify-center text-white font-bold text-xs">O</div>
            <span className="font-bold text-slate-300">OMNIREPMAX</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 OmniRepMax. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-sm text-slate-400">
            <a href="#" className="hover:text-white">Termos de Uso</a>
            <a href="#" className="hover:text-white">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}