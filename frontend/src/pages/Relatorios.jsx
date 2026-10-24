import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { fmtBRL } from "../lib/format";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  TrendingUp, DollarSign, Users, Package, Activity, 
  AlertTriangle, Download, FileText, ShoppingCart
} from "lucide-react";
import { toast } from "sonner";

const COLORS = ['#075BFF', '#08D5F5', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899'];

// ---------------------------------------------------------------------------
// Utilitário reutilizável de exportação CSV
// headers: [{ label: "Nome da Coluna", value: "chave_no_objeto" | (row) => valor }]
// ---------------------------------------------------------------------------
const exportToCSV = (rows, filename, headers) => {
  if (!rows || rows.length === 0) {
    toast.error("Sem dados para exportar.");
    return;
  }
  const csvHeader = headers.map(h => `"${h.label}"`).join(";");
  const csvRows = rows.map(row =>
    headers.map(h => {
      const raw = typeof h.value === "function" ? h.value(row) : row[h.value];
      const val = raw === null || raw === undefined ? "" : raw;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(";")
  );
  // BOM \uFEFF garante que Excel abra com acentos corretos (UTF-8)
  const csvContent = "\uFEFF" + [csvHeader, ...csvRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success(`Planilha "${filename}" exportada!`);
};

// Botão padrão de exportação
const ExportBtn = ({ onClick, label = "Exportar CSV" }) => (
  <Button variant="outline" size="sm" onClick={onClick}>
    <Download className="w-4 h-4 mr-2" /> {label}
  </Button>
);

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

  // Dados normalizados para exportação
  const comercial = data.comercial || {};
  const financeiro = data.financeiro || {};
  const clientes = data.clientes || { curva_abc: { A: [], B: [], C: [] }, inativos: { d30: [], d60: [], d90: [] } };
  const produtos = data.produtos || { top_produtos: [], sem_giro: [] };
  const produtividade = data.produtividade || {};

  return (
    <div className="pb-10">
      <PageHeader 
        title="Relatórios Gerenciais" 
        subtitle="Visão estratégica da sua operação" 
      />

      {/* PAINEL DE CICLO COMPLETO */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Pedidos Pendentes</div>
          <div className="text-xl font-bold">{comercial.qtd_pendentes ?? 0}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-slate-400 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Tempo Méd. Faturar</div>
          <div className="text-xl font-bold">{comercial.tempo_medio_faturamento_dias ?? 0} dias</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Valor Faturado</div>
          <div className="text-xl font-bold text-amber-600">{fmtBRL(financeiro.valor_faturado ?? 0)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-indigo-500 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Comissões Previstas</div>
          <div className="text-xl font-bold text-indigo-600">{fmtBRL(financeiro.com_prevista ?? 0)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Comissões Recebidas</div>
          <div className="text-xl font-bold text-emerald-600">{fmtBRL(financeiro.com_recebida ?? 0)}</div>
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Vendas por Representada</h3>
                <ExportBtn
                  onClick={() => exportToCSV(
                    (comercial.por_representada || []).map(r => ({
                      nome: r.nome,
                      valor: r.volume ?? r.valor ?? 0
                    })),
                    `vendas_por_representada_${new Date().toISOString().split("T")[0]}.csv`,
                    [
                      { label: "Representada", value: "nome" },
                      { label: "Volume de Vendas (R$)", value: (r) => r.valor.toFixed(2).replace(".", ",") }
                    ]
                  )}
                />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(comercial.por_representada || []).map(r => ({
                  nome: r.nome, valor: r.volume ?? r.valor ?? 0
                }))}>
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
                <div className="text-3xl font-bold mt-1">{fmtBRL(comercial.fat_mes ?? 0)}</div>
              </Card>
              <Card className="p-5">
                <div className="text-xs font-semibold text-slate-500 uppercase">Ticket Médio</div>
                <div className="text-2xl font-bold mt-1">{fmtBRL(comercial.ticket_medio ?? 0)}</div>
              </Card>
              <Card className="p-5">
                <div className="text-xs font-semibold text-slate-500 uppercase">Total de Pedidos</div>
                <div className="text-2xl font-bold mt-1">{comercial.qtd_pedidos ?? 0}</div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ABA 2: FINANCEIRO */}
        <TabsContent value="financeiro" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Conciliação de Faturamento</h3>
                <ExportBtn
                  onClick={() => exportToCSV(
                    [
                      { descricao: "Valor Total dos Pedidos", valor: financeiro.valor_pedido ?? 0 },
                      { descricao: "Valor Efetivamente Faturado", valor: financeiro.valor_faturado ?? 0 },
                      { descricao: "Comissões Previstas", valor: financeiro.com_prevista ?? 0 },
                      { descricao: "Comissões a Receber", valor: financeiro.com_a_receber ?? 0 },
                      { descricao: "Comissões Recebidas", valor: financeiro.com_recebida ?? 0 }
                    ],
                    `conciliacao_financeira_${new Date().toISOString().split("T")[0]}.csv`,
                    [
                      { label: "Descrição", value: "descricao" },
                      { label: "Valor (R$)", value: (r) => r.valor.toFixed(2).replace(".", ",") }
                    ]
                  )}
                />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Descrição</th>
                    <th className="text-right py-2 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="py-2">Valor Total dos Pedidos</td><td className="py-2 text-right font-mono">{fmtBRL(financeiro.valor_pedido ?? 0)}</td></tr>
                  <tr className="border-b"><td className="py-2">Valor Efetivamente Faturado</td><td className="py-2 text-right font-mono text-amber-600">{fmtBRL(financeiro.valor_faturado ?? 0)}</td></tr>
                  <tr className="border-b"><td className="py-2">Comissões Previstas</td><td className="py-2 text-right font-mono text-indigo-600">{fmtBRL(financeiro.com_prevista ?? 0)}</td></tr>
                  <tr className="border-b"><td className="py-2">Comissões a Receber</td><td className="py-2 text-right font-mono text-rose-600">{fmtBRL(financeiro.com_a_receber ?? 0)}</td></tr>
                  <tr><td className="py-2 font-bold">Comissões Recebidas</td><td className="py-2 text-right font-mono text-emerald-600 font-bold">{fmtBRL(financeiro.com_recebida ?? 0)}</td></tr>
                </tbody>
              </table>
            </Card>
            <Card className="p-5 flex flex-col items-center justify-center">
              <h3 className="font-semibold mb-4 self-start">Status das Comissões</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Recebidas', value: financeiro.com_recebida ?? 0 },
                      { name: 'A Receber', value: financeiro.com_a_receber ?? 0 }
                    ]}
                    innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                  >
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Curva ABC (Top Clientes)</h3>
                <ExportBtn
                  onClick={() => exportToCSV(
                    [
                      ...(clientes.curva_abc?.A || []).map(c => ({ ...c, curva: "A" })),
                      ...(clientes.curva_abc?.B || []).map(c => ({ ...c, curva: "B" })),
                      ...(clientes.curva_abc?.C || []).map(c => ({ ...c, curva: "C" }))
                    ],
                    `curva_abc_clientes_${new Date().toISOString().split("T")[0]}.csv`,
                    [
                      { label: "Curva", value: "curva" },
                      { label: "Cliente", value: "nome" },
                      { label: "Faturamento (R$)", value: (r) => (r.valor ?? 0).toFixed(2).replace(".", ",") }
                    ]
                  )}
                />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Cliente</th>
                    <th className="text-right py-2 font-semibold">Faturamento</th>
                    <th className="text-center py-2 font-semibold">Curva</th>
                  </tr>
                </thead>
                <tbody>
                  {(clientes.curva_abc?.A || []).map((c, i) => (
                    <tr key={`a-${i}`} className="border-b">
                      <td className="py-2">{c.nome}</td>
                      <td className="py-2 text-right font-mono">{fmtBRL(c.valor ?? 0)}</td>
                      <td className="py-2 text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">A</span></td>
                    </tr>
                  ))}
                  {(clientes.curva_abc?.B || []).map((c, i) => (
                    <tr key={`b-${i}`} className="border-b">
                      <td className="py-2">{c.nome}</td>
                      <td className="py-2 text-right font-mono">{fmtBRL(c.valor ?? 0)}</td>
                      <td className="py-2 text-center"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">B</span></td>
                    </tr>
                  ))}
                  {(clientes.curva_abc?.A?.length ?? 0) === 0 && (clientes.curva_abc?.B?.length ?? 0) === 0 && (
                    <tr><td colSpan={3} className="text-center py-4 text-slate-500">Nenhum cliente com faturamento ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
            <div className="space-y-4">
              <Card className="p-5 border-l-4 border-l-amber-500">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold">Inativos há mais de 60 dias</h4>
                  <ExportBtn
                    onClick={() => exportToCSV(
                      [
                        ...(clientes.inativos?.d60 || []).map(n => ({ nome: n, faixa: "60-90 dias" })),
                        ...(clientes.inativos?.d90 || []).map(n => ({ nome: n, faixa: "90+ dias" }))
                      ],
                      `clientes_inativos_${new Date().toISOString().split("T")[0]}.csv`,
                      [
                        { label: "Cliente", value: "nome" },
                        { label: "Faixa de inatividade", value: "faixa" }
                      ]
                    )}
                  />
                </div>
                <ul className="text-sm text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                  {(clientes.inativos?.d60 || []).map((n, i) => <li key={`60-${i}`}>• {n}</li>)}
                  {(clientes.inativos?.d90 || []).map((n, i) => <li key={`90-${i}`} className="text-rose-500">• {n} (90d+)</li>)}
                  {(clientes.inativos?.d60?.length ?? 0) === 0 && (clientes.inativos?.d90?.length ?? 0) === 0 && (
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-emerald-600">Top 10 Produtos Vendidos</h3>
                <ExportBtn
                  onClick={() => exportToCSV(
                    produtos.top_produtos || [],
                    `top_produtos_${new Date().toISOString().split("T")[0]}.csv`,
                    [
                      { label: "Produto", value: "nome" },
                      { label: "Quantidade", value: "qtd" },
                      { label: "Valor (R$)", value: (r) => (r.valor ?? 0).toFixed(2).replace(".", ",") }
                    ]
                  )}
                />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Produto</th>
                    <th className="text-right py-2 font-semibold">Qtd</th>
                    <th className="text-right py-2 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {(produtos.top_produtos || []).map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 font-medium">{p.nome}</td>
                      <td className="py-2 text-right">{p.qtd}</td>
                      <td className="py-2 text-right font-mono">{fmtBRL(p.valor ?? 0)}</td>
                    </tr>
                  ))}
                  {(produtos.top_produtos?.length ?? 0) === 0 && (
                    <tr><td colSpan={3} className="text-center py-4 text-slate-500">Nenhum produto vendido ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-rose-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Produtos sem Giro</h3>
                <ExportBtn
                  onClick={() => exportToCSV(
                    produtos.sem_giro || [],
                    `produtos_sem_giro_${new Date().toISOString().split("T")[0]}.csv`,
                    [
                      { label: "Produto", value: "nome" },
                      { label: "Marca", value: "marca" }
                    ]
                  )}
                />
              </div>
              <ul className="space-y-2 text-sm">
                {(produtos.sem_giro || []).map((p, i) => (
                  <li key={i} className="flex justify-between border-b pb-2">
                    <span>{p.nome}</span>
                    <span className="text-xs text-slate-400">{p.marca}</span>
                  </li>
                ))}
                {(produtos.sem_giro?.length ?? 0) === 0 && <li className="text-slate-500">Todos os produtos cadastrados já tiveram vendas.</li>}
              </ul>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 5: PRODUTIVIDADE */}
        <TabsContent value="produtividade" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Visitas Realizadas</div>
              <div className="text-3xl font-bold mt-2">{produtividade.visitas ?? 0}</div>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Clientes Atendidos</div>
              <div className="text-3xl font-bold mt-2">{produtividade.clientes_atendidos ?? 0}</div>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Positivados (Compraram)</div>
              <div className="text-3xl font-bold mt-2">{produtividade.clientes_positivados ?? 0}</div>
            </Card>
            <Card className="p-5 text-center bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
              <div className="text-xs font-bold uppercase opacity-90">Taxa de Conversão</div>
              <div className="text-3xl font-bold mt-2">{produtividade.conversao ?? 0}%</div>
            </Card>
          </div>
          <div className="flex justify-end">
            <ExportBtn
              label="Exportar Resumo de Produtividade"
              onClick={() => exportToCSV(
                [{
                  visitas: produtividade.visitas ?? 0,
                  clientes_atendidos: produtividade.clientes_atendidos ?? 0,
                  clientes_positivados: produtividade.clientes_positivados ?? 0,
                  conversao: produtividade.conversao ?? 0
                }],
                `produtividade_${new Date().toISOString().split("T")[0]}.csv`,
                [
                  { label: "Visitas Realizadas", value: "visitas" },
                  { label: "Clientes Atendidos", value: "clientes_atendidos" },
                  { label: "Clientes Positivados", value: "clientes_positivados" },
                  { label: "Taxa de Conversão (%)", value: "conversao" }
                ]
              )}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}