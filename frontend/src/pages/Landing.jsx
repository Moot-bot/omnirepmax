import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Check, TrendingUp, Users, Percent, ShoppingCart, Sparkles, Building2, FileUp, Kanban, MapPin, Smartphone, Shield, ArrowRight, Star } from "lucide-react";
import Logo from "../components/Logo";

const features = [
  { icon: Building2, title: "Multi-representadas", desc: "Gerencie 4, 10 ou 40 indústrias representadas ao mesmo tempo, com comissão e prazo próprios." },
  { icon: Kanban, title: "Funil Kanban", desc: "Arraste oportunidades entre etapas e veja o valor previsto de cada estágio em tempo real." },
  { icon: ShoppingCart, title: "Pedidos com cálculo automático", desc: "Digite itens, o sistema calcula subtotal, desconto, frete, total e comissão em segundos." },
  { icon: Percent, title: "Comissões rastreadas", desc: "Previsto, faturado, recebido e pendente por representada, pedido e cliente — nunca mais perca R$1." },
  { icon: TrendingUp, title: "Contas a Pagar e Receber", desc: "Controle financeiro completo com alertas de vencimento e baixa em 1 clique." },
  { icon: Sparkles, title: "Insights com IA", desc: "A IA analisa sua carteira e sugere próximas ações: quem visitar, o que oferecer, onde crescer." },
  { icon: FileUp, title: "Importação XML NF-e", desc: "Cole ou envie o XML da NF-e da indústria e o sistema associa a pedidos e clientes." },
  { icon: MapPin, title: "Mapa comercial", desc: "Veja seus clientes distribuídos no Brasil por status, cidade e representada." },
];

const plans = [
  { name: "Solo", price: "97", desc: "Representante autônomo com até 2 representadas", featured: false, features: ["Até 2 representadas", "Clientes e produtos ilimitados", "Funil Kanban", "Pedidos e comissões", "1 usuário", "Suporte por e-mail"] },
  { name: "Profissional", price: "197", desc: "Escritório com múltiplas indústrias", featured: true, features: ["Representadas ilimitadas", "Insights com IA ilimitados", "Importação XML NF-e", "Contas a pagar/receber", "Até 5 usuários", "Backup diário automático", "Suporte prioritário"] },
  { name: "Equipe", price: "397", desc: "Time de representantes com supervisão", featured: false, features: ["Tudo do Profissional", "Usuários ilimitados", "Perfis Admin/Supervisor/Financeiro", "Relatórios exportáveis", "API para integração", "Onboarding assistido", "Suporte por WhatsApp"] },
];

const stats = [
  { n: "4h", l: "economizadas por dia em planilhas" },
  { n: "+38%", l: "de conversão no funil de vendas" },
  { n: "100%", l: "das comissões rastreadas" },
  { n: "R$ 0", l: "de mensalidade para começar (7 dias grátis)" },
];

const testimonials = [
  { nome: "Rafael Costa", cargo: "Rep. de vestuário — SP", texto: "Antes eu gerenciava 6 marcas em planilhas. Hoje o OMNIREP MAX me dá o número da comissão do mês em 1 clique." },
  { nome: "Camila Rocha", cargo: "Rep. de cosméticos — MG", texto: "O funil Kanban acabou com o esquecimento de follow-up. Fechei 3 clientes novos no primeiro mês só com os lembretes." },
  { nome: "Julia Nunes", cargo: "Rep. de alimentos — PR", texto: "Importar o XML da NF-e da indústria e ver a comissão calculada automaticamente é um sonho antigo virando realidade." },
];

export default function Landing() {
  const [openPlan, setOpenPlan] = useState(null);
  return (
    <div className="min-h-screen bg-white text-[#152238] font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/lp" className="flex items-center">
            <Logo variant="wordmark" size={34} onDark={false} />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#recursos" className="hover:text-[#075BFF] transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-[#075BFF] transition-colors">Planos</a>
            <a href="#depoimentos" className="hover:text-[#075BFF] transition-colors">Clientes</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" data-testid="btn-lp-login" className="hidden sm:inline-flex">Entrar</Button></Link>
            <Link to="/login"><Button data-testid="btn-lp-start" className="bg-brand-cta hover:brightness-110 text-white border-0 shadow-md shadow-[#075BFF]/20">Começar grátis</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10"
             style={{ backgroundImage: "linear-gradient(135deg, #F4F7FC 0%, #ffffff 50%, #EFF6FF 100%)" }} />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full -z-10"
             style={{ background: "radial-gradient(circle, rgba(7,91,255,0.18) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-6"
                 style={{ background: "rgba(7,91,255,0.08)", borderColor: "rgba(7,91,255,0.25)", color: "#075BFF" }}>
              <Sparkles className="w-3.5 h-3.5" /> Feito por e para representantes comerciais brasileiros
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Toda a sua operação comercial <span className="text-brand-gradient">em um só lugar</span>.
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
              CRM + ERP completo para representantes com múltiplas indústrias. Cadastre representadas, controle clientes, monte pedidos, acompanhe comissões e cobre no prazo — tudo do celular ou do notebook.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/login"><Button size="lg" data-testid="btn-hero-cta" className="bg-brand-cta hover:brightness-110 text-white h-12 px-8 w-full sm:w-auto border-0 shadow-md shadow-[#075BFF]/25">Começar grátis por 7 dias <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
              <a href="#recursos"><Button size="lg" variant="outline" className="h-12 px-8 w-full sm:w-auto border-[#075BFF]/30 text-[#075BFF] hover:bg-[#075BFF]/5">Ver recursos</Button></a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />Sem cartão</div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />Instala como app</div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />Suporte pt-BR</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl blur-2xl"
                 style={{ background: "linear-gradient(135deg, rgba(7,91,255,0.25), rgba(8,213,245,0.2))" }} />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" /><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div className="ml-4 text-[10px] font-mono text-slate-500">omnirepmax.app/dashboard</div>
              </div>
              <div className="p-4 sm:p-5 bg-slate-50">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Dashboard</div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[{ l: "Faturamento", v: "R$ 60.377" }, { l: "Comissões", v: "R$ 6.135" }, { l: "Pedidos", v: "9" }].map((k) => (
                    <div key={k.l} className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">{k.l}</div>
                      <div className="font-display font-extrabold text-lg mt-1">{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 mb-2 font-semibold">Evolução</div>
                  <svg viewBox="0 0 300 80" className="w-full h-16">
                    <defs>
                      <linearGradient id="lgrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#075BFF" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#08D5F5" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="lstroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#075BFF" />
                        <stop offset="100%" stopColor="#08D5F5" />
                      </linearGradient>
                    </defs>
                    <path d="M0,70 L50,65 L100,68 L150,55 L200,40 L250,20 L300,10 L300,80 L0,80 Z" fill="url(#lgrad)" />
                    <path d="M0,70 L50,65 L100,68 L150,55 L200,40 L250,20 L300,10" fill="none" stroke="url(#lstroke)" strokeWidth="2.5" />
                  </svg>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white rounded border border-slate-200 text-xs"><span className="text-emerald-600 font-semibold">+</span> PED-00015 R$ 1.000</div>
                  <div className="p-2 bg-white rounded border border-slate-200 text-xs"><span className="text-[#075BFF] font-semibold">•</span> Nova visita 15h</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-200 bg-[#F4F7FC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#152238]">{s.n}</div>
              <div className="text-xs text-slate-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm font-semibold text-[#075BFF] uppercase tracking-wider">Tudo que você precisa</div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">Recursos que fazem a diferença no dia a dia</h2>
          <p className="mt-4 text-slate-600">Da prospecção ao pagamento da comissão, o OMNIREP MAX automatiza tarefas que hoje consomem horas do seu dia.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="p-5 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:-translate-y-1 hover:border-[#075BFF]/30 transition-all">
              <div className="w-10 h-10 rounded-lg bg-brand-cyan-gradient text-white flex items-center justify-center mb-4 shadow-sm"><f.icon className="w-5 h-5" /></div>
              <div className="font-semibold text-[#152238]">{f.title}</div>
              <div className="text-sm text-slate-600 mt-1 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PWA callout */}
      <section className="relative overflow-hidden text-white brand-diagonals"
               style={{ backgroundImage: "radial-gradient(circle at 15% 30%, rgba(7,91,255,0.3) 0, transparent 45%), radial-gradient(circle at 85% 80%, rgba(8,213,245,0.22) 0, transparent 48%), linear-gradient(135deg, #061329 0%, #0A1F46 55%, #0B2F70 100%)" }}>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold mb-4">
              <Smartphone className="w-3.5 h-3.5" />App instalável (PWA)
            </div>
            <h3 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Instale no celular sem passar pela loja de apps.</h3>
            <p className="mt-4 text-slate-300 max-w-md">Abra o OMNIREP MAX no navegador do celular, clique em "Adicionar à tela inicial" e pronto — vira um app com ícone, sem app store, sem download pesado.</p>
            <div className="mt-6 flex items-center gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[#22D3EE]" />Funciona offline no cache</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-[#22D3EE]" />Login único</div>
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="w-52 h-96 bg-slate-800 rounded-[2.5rem] border-8 border-slate-700 p-1 shadow-2xl">
              <div className="w-full h-full bg-slate-50 rounded-[2rem] overflow-hidden relative">
                <div className="p-3 bg-[#06152F] border-b border-white/10 flex items-center justify-center">
                  <Logo variant="wordmark" size={22} onDark />
                </div>
                <div className="p-3 space-y-2">
                  {[{ l: "Faturamento", v: "R$ 60k" }, { l: "Comissões", v: "R$ 6.1k" }, { l: "Pedidos", v: "9" }].map((k) => (
                    <div key={k.l} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-900">
                      <div className="text-[8px] uppercase text-slate-500 font-semibold">{k.l}</div>
                      <div className="font-display font-extrabold text-sm">{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm font-semibold text-[#075BFF] uppercase tracking-wider">Planos</div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">Preços que cabem em qualquer operação</h2>
          <p className="mt-4 text-slate-600">7 dias grátis em qualquer plano. Cancele a qualquer momento.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.name} data-testid={`plan-${p.name.toLowerCase()}`} className={`relative p-6 rounded-2xl border ${p.featured ? "border-[#075BFF] bg-gradient-to-br from-white to-[#EFF6FF] shadow-xl scale-[1.02]" : "border-slate-200 bg-white"}`}>
              {p.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-cta text-white text-xs font-bold shadow-md shadow-[#075BFF]/25">Mais escolhido</div>}
              <div className="font-display text-2xl font-extrabold">{p.name}</div>
              <div className="text-sm text-slate-500 mt-1">{p.desc}</div>
              <div className="mt-6 flex items-baseline gap-1"><span className="text-sm text-slate-500">R$</span><span className="font-display text-5xl font-extrabold tracking-tight">{p.price}</span><span className="text-sm text-slate-500">/mês</span></div>
              <Link to="/login"><Button data-testid={`btn-plan-${p.name.toLowerCase()}`} className={`w-full mt-6 h-11 border-0 ${p.featured ? "bg-brand-cta hover:brightness-110 text-white shadow-md shadow-[#075BFF]/20" : "bg-[#0A1F46] hover:bg-[#0A1F46]/90 text-white"}`}>Começar agora</Button></Link>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="bg-[#F4F7FC] border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-sm font-semibold text-[#075BFF] uppercase tracking-wider">Depoimentos</div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">Representantes reais, resultados reais</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.nome} className="p-6 bg-white rounded-xl border border-slate-200">
                <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="mt-4 text-sm text-slate-700 leading-relaxed">"{t.texto}"</p>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="font-semibold text-sm">{t.nome}</div>
                  <div className="text-xs text-slate-500">{t.cargo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto">Pare de perder comissão em planilhas.</h2>
        <p className="mt-4 text-slate-600 max-w-xl mx-auto">Comece agora com 7 dias grátis. Dados demo prontos para testar todos os fluxos.</p>
        <Link to="/login"><Button size="lg" data-testid="btn-cta-final" className="mt-8 bg-brand-cta hover:brightness-110 text-white h-12 px-10 border-0 shadow-md shadow-[#075BFF]/25">Criar minha conta grátis <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Logo variant="wordmark" size={26} onDark={false} />
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-[#075BFF]">Entrar</Link>
            <a href="#planos" className="hover:text-[#075BFF]">Planos</a>
            <a href="mailto:contato@omnirepmax.app" className="hover:text-[#075BFF]">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
