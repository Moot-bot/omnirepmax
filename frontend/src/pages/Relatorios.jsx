import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { fmtBRL } from "../lib/format";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  TrendingUp, DollarSign, Clock, Users, Package, 
  Activity, AlertTriangle, CheckCircle2, ShoppingCart, Percent
} from "lucide-react";

const COLORS = ['#075BFF', '#08D5F5', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899'];

export default function Relatorios() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/relatorios/geral");
      setData(res.data);
    } catch {
      // erro
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <div className="p-10 text-center">Gerando relatórios...</div>;

  return (
    <div className="pb-10">
      <PageHeader title="Relatórios Gerenciais" subtitle="Visão estratégica da sua operação" />

      {/* PAINEL DE CICLO COMPLETO (Destaque no topo) */}
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-6 h-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
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
              <Table>
                <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell>Valor Total dos Pedidos</TableCell><TableCell className="text-right font-mono">{fmtBRL(data.financeiro.valor_pedido)}</TableCell></TableRow>
                  <TableRow><TableCell>Valor Efetivamente Faturado</TableCell><TableCell className="text-right font-mono text-amber-600">{fmtBRL(data.financeiro.valor_faturado)}</TableCell></TableRow>
                  <TableRow><TableCell>Comissões Previstas</TableCell><TableCell className="text-right font-mono text-indigo-600">{fmtBRL(data.financeiro.com_prevista)}</TableCell></TableRow>
                  <TableRow><TableCell>Comissões a Receber</TableCell><TableCell className="text-right font-mono text-rose-600">{fmtBRL(data.financeiro.com_a_receber)}</TableCell></TableRow>
                  <TableRow><TableCell>Comissões Recebidas</TableCell><TableCell className="text-right font-mono text-emerald-600 font-bold">{fmtBRL(data.financeiro.com_recebida)}</TableCell></TableRow>
                </TableBody>
              </Table>
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
                  <Legend />
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
              <Table>
                <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Faturamento</TableHead><TableHead className="text-center">Curva</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.clientes.curva_abc.A.map((c, i) => (
                    <TableRow key={i}><TableCell>{c.nome}</TableCell><TableCell className="text-right font-mono">{fmtBRL(c.valor)}</TableCell><TableCell className="text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">A</span></TableCell></TableRow>
                  ))}
                  {data.clientes.curva_abc.B.map((c, i) => (
                    <TableRow key={i}><TableCell>{c.nome}</TableCell><TableCell className="text-right font-mono">{fmtBRL(c.valor)}</TableCell><TableCell className="text-center"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">B</span></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <div className="space-y-4">
              <Card className="p-5 border-l-4 border-l-amber-500">
                <h4 className="text-sm font-bold mb-2">Inativos há mais de 60 dias</h4>
                <ul className="text-sm text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                  {data.clientes.inativos.d60.map((n, i) => <li key={i}>• {n}</li>)}
                  {data.clientes.inativos.d90.map((n, i) => <li key={i} className="text-rose-500">• {n} (90d+)</li>)}
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
              <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.produtos.top_produtos.map((p, i) => (
                    <TableRow key={i}><TableCell className="font-medium">{p.nome}</TableCell><TableCell className="text-right">{p.qtd}</TableCell><TableCell className="text-right font-mono">{fmtBRL(p.valor)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
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