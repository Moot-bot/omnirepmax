import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { fmtBRL } from "../lib/format";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  TrendingUp, DollarSign, Users, Package, Activity, 
  AlertTriangle, ShoppingCart
} from "lucide-react";
import { toast } from "sonner";

const COLORS = ['#075BFF', '#08D5F5', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899'];

export default function Relatorios() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/relatorios/geral");
      setData(res.data);
    } catch (e) {
      toast.error("Erro ao carregar relatórios. Verifique se a rota /relatorios/geral existe no backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-10 text-center text-slate-500">Gerando relatórios...</div>;
  if (!data) return <div className="p-10 text-center text-rose-500">Não foi possível carregar os relatórios. Verifique o deploy do backend.</div>;

  return (
    <div className="pb-10">
      <PageHeader title="Relatórios Gerenciais" subtitle="Visão estratégica da sua operação" />

      {/* PAINEL DE CICLO COMPLETO */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Pedidos Pendentes</div>
          <div className="text-xl font-bold">{data.comercial.qtd_pendentes}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-slate-400 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Tempo Méd. Faturar</div>
          <div className="text-xl font-bold">{data.comercial.tempo_medio_faturamento_dias} dias</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Valor Faturado</div>
          <div className="text-xl font-bold text-amber-600">{fmtBRL(data.financeiro.valor_faturado)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-indigo-500 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Comissões Previstas</div>
          <div className="text-xl font-bold text-indigo-600">{fmtBRL(data.financeiro.com_prevista)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Comissões Recebidas</div>
          <div className="text-xl font-bold text-emerald-600">{fmtBRL(data.financeiro.com_recebida)}</div>
        </Card>
      </div>

      <Tabs defaultValue="vendas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6 h-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          <TabsTrigger value="vendas" className="py-2"><TrendingUp className="w-4 h-4 mr-2" /> Vendas</TabsTrigger>
          <TabsTrigger value="financeiro" className="py-2"><DollarSign className="w-4 h-4 mr-2" /> Financeiro</TabsTrigger>
          <TabsTrigger value="clientes" className="py-2"><Users className="w-4 h-4 mr-2" /> Carteira</TabsTrigger>
          <TabsTrigger value="produtos" className="py-2"><Package className="w-4 h-4 mr-2" /> Produtos</TabsTrigger>
          <TabsTrigger value="produtividade" className="py-2"><Activity className="w-4 h-4 mr-2" /> Produtividade</TabsTrigger>
        </TabsList>

        {/* ABA 1: VENDAS */}
        <TabsContent value="vendas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 md:col-span-2">
              <h3 className="font-semibold mb-4">Vendas por Representada</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.comercial.por_representada}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip formatter={(v) => fmtBRL(v)} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="valor" fill="#075BFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <div className="space-y-4">
              <Card className="p-5 bg-gradient-to-br from-[#075BFF] to-blue-600 text-white">
                <div className="text-xs font-semibold opacity-80 uppercase">Vendas do Mês</div>
                <div className="text-3xl font-bold mt-1">{fmtBRL(data.comercial.fat_mes)}</div>
              </Card>
              <Card className="p-5">
                <div className="text-xs font-semibold text-slate-500 uppercase">Ticket Médio</div>
                <div className="text-2xl font-bold mt-1">{fmtBRL(data.comercial.ticket_medio)}</div>
              </Card>
              <Card className="p-5">
                <div className="text-xs font-semibold text-slate-500 uppercase">Total de Pedidos</div>
                <div className="text-2xl font-bold mt-1">{data.comercial.qtd_pedidos}</div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ABA 2: FINANCEIRO */}
        <TabsContent value="financeiro" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Conciliação de Faturamento</h3>
              {/* Tabela HTML PURA (sem Shadcn) */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Descrição</th>
                    <th className="text-right py-2 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="py-2">Valor Total dos Pedidos</td><td className="py-2 text-right font-mono">{fmtBRL(data.financeiro.valor_pedido)}</td></tr>
                  <tr className="border-b"><td className="py-2">Valor Efetivamente Faturado</td><td className="py-2 text-right font-mono text-amber-600">{fmtBRL(data.financeiro.valor_faturado)}</td></tr>
                  <tr className="border-b"><td className="py-2">Comissões Previstas</td><td className="py-2 text-right font-mono text-indigo-600">{fmtBRL(data.financeiro.com_prevista)}</td></tr>
                  <tr className="border-b"><td className="py-2">Comissões a Receber</td><td className="py-2 text-right font-mono text-rose-600">{fmtBRL(data.financeiro.com_a_receber)}</td></tr>
                  <tr><td className="py-2 font-bold">Comissões Recebidas</td><td className="py-2 text-right font-mono text-emerald-600 font-bold">{fmtBRL(data.financeiro.com_recebida)}</td></tr>
                </tbody>
              </table>
            </Card>
            <Card className="p-5 flex flex-col items-center justify-center">
              <h3 className="font-semibold mb-4 self-start">Status das Comissões</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={[
                    { name: 'Recebidas', value: data.financeiro.com_recebida },
                    { name: 'A Receber', value: data.financeiro.com_a_receber }
                  ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    <Cell fill="#10B981" /><Cell fill="#F59E0B" />
                  </Pie>
                  <Tooltip formatter={(v) => fmtBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 3: CLIENTES */}
        <TabsContent value="clientes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-semibold mb-4">Curva ABC (Top Clientes)</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Cliente</th>
                    <th className="text-right py-2 font-semibold">Faturamento</th>
                    <th className="text-center py-2 font-semibold">Curva</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clientes.curva_abc.A.map((c, i) => (
                    <tr key={i} className="border-b"><td className="py-2">{c.nome}</td><td className="py-2 text-right font-mono">{fmtBRL(c.valor)}</td><td className="py-2 text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">A</span></td></tr>
                  ))}
                  {data.clientes.curva_abc.B.map((c, i) => (
                    <tr key={i} className="border-b"><td className="py-2">{c.nome}</td><td className="py-2 text-right font-mono">{fmtBRL(c.valor)}</td><td className="py-2 text-center"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">B</span></td></tr>
                  ))}
                  {data.clientes.curva_abc.A.length === 0 && data.clientes.curva_abc.B.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-4 text-slate-500">Nenhum cliente com faturamento ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
            <div className="space-y-4">
              <Card className="p-5 border-l-4 border-l-amber-500">
                <h4 className="text-sm font-bold mb-2">Inativos há mais de 60 dias</h4>
                <ul className="text-sm text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                  {data.clientes.inativos.d60.map((n, i) => <li key={i}>• {n}</li>)}
                  {data.clientes.inativos.d90.map((n, i) => <li key={i} className="text-rose-500">• {n} (90d+)</li>)}
                  {data.clientes.inativos.d60.length === 0 && data.clientes.inativos.d90.length === 0 && (
                    <li className="text-slate-400">Nenhum cliente inativo.</li>
                  )}
                </ul>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ABA 4: PRODUTOS */}
        <TabsContent value="produtos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold mb-4 text-emerald-600">Top 10 Produtos Vendidos</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Produto</th>
                    <th className="text-right py-2 font-semibold">Qtd</th>
                    <th className="text-right py-2 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.produtos.top_produtos.map((p, i) => (
                    <tr key={i} className="border-b"><td className="py-2 font-medium">{p.nome}</td><td className="py-2 text-right">{p.qtd}</td><td className="py-2 text-right font-mono">{fmtBRL(p.valor)}</td></tr>
                  ))}
                  {data.produtos.top_produtos.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-slate-500">Nenhum produto vendido ainda.</td></tr>}
                </tbody>
              </table>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-4 text-rose-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Produtos sem Giro</h3>
              <ul className="space-y-2 text-sm">
                {data.produtos.sem_giro.map((p, i) => (
                  <li key={i} className="flex justify-between border-b pb-2">
                    <span>{p.nome}</span>
                    <span className="text-xs text-slate-400">{p.marca}</span>
                  </li>
                ))}
                {data.produtos.sem_giro.length === 0 && <li className="text-slate-500">Todos os produtos cadastrados já tiveram vendas.</li>}
              </ul>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 5: PRODUTIVIDADE */}
        <TabsContent value="produtividade" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Visitas Realizadas</div>
              <div className="text-3xl font-bold mt-2">{data.produtividade.visitas}</div>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Clientes Atendidos</div>
              <div className="text-3xl font-bold mt-2">{data.produtividade.clientes_atendidos}</div>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Positivados (Compraram)</div>
              <div className="text-3xl font-bold mt-2">{data.produtividade.clientes_positivados}</div>
            </Card>
            <Card className="p-5 text-center bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
              <div className="text-xs font-bold uppercase opacity-90">Taxa de Conversão</div>
              <div className="text-3xl font-bold mt-2">{data.produtividade.conversao}%</div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}