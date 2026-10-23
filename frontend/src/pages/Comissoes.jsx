import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { fmtBRL } from "../lib/format";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Percent, TrendingUp, DollarSign, Clock, Building2, ListChecks } from "lucide-react";
import { toast } from "sonner";

export default function Comissoes() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para o Modal de Parcelas
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCom, setSelectedCom] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [loadingParcelas, setLoadingParcelas] = useState(false);

  const load = useCallback(async () => {
    try {
      const [comRes, repRes] = await Promise.all([
        api.get("/comissoes"),
        api.get("/representadas")
      ]);
      setList(comRes.data);
      setReps(repRes.data);
    } catch {
      toast.error("Erro ao carregar dados de comissões.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // --- Cálculos do Resumo Global ---
  const comissoesPrevistas = list.reduce((acc, c) => acc + (c.valor_liquido || 0), 0);
  const totalAReceber = list.reduce((acc, c) => acc + (c.saldo_pendente || 0), 0);
  const recebido = list.reduce((acc, c) => acc + (c.valor_recebido || 0), 0);
  const hoje = new Date();
  
  // Consideramos vencidas as comissões que ainda têm saldo e já passaram da data prevista
  const vencidas = list.filter(c => c.saldo_pendente > 0 && new Date(c.data_prevista) < hoje)
                      .reduce((acc, c) => acc + c.saldo_pendente, 0);

  // --- Agrupamento por Representada (Fábrica) ---
  const resumoPorFabrica = reps.map(rep => {
    const comRep = list.filter(c => c.representada_id === rep.id);
    if (comRep.length === 0) return null;
    
    return {
      id: rep.id,
      nome: rep.nome_fantasia || rep.razao_social,
      logo: rep.logo,
      qtdPedidos: comRep.length,
      totalGerado: comRep.reduce((acc, c) => acc + (c.valor_liquido || 0), 0),
      totalRecebido: comRep.reduce((acc, c) => acc + (c.valor_recebido || 0), 0),
      saldoPendente: comRep.reduce((acc, c) => acc + (c.saldo_pendente || 0), 0),
    };
  }).filter(Boolean); // Remove nulos

  // --- Função para abrir o Modal de Parcelas ---
  const verParcelas = async (comissao) => {
    setSelectedCom(comissao);
    setModalOpen(true);
    setLoadingParcelas(true);
    try {
      // Busca todas as contas a receber e filtra pelo comissao_id
      const res = await api.get("/contas-receber");
      const parcelasFiltradas = res.data.filter(ar => ar.comissao_id === comissao.id);
      // Ordena pela data de vencimento
      parcelasFiltradas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
      setParcelas(parcelasFiltradas);
    } catch {
      toast.error("Erro ao carregar as parcelas.");
    } finally {
      setLoadingParcelas(false);
    }
  };

  const getRepName = (id) => {
    const rep = reps.find(r => r.id === id);
    return rep ? (rep.nome_fantasia || rep.razao_social) : "Fábrica";
  };

  return (
    <div className="pb-10">
      <PageHeader 
        title="Gestão de Comissões" 
        subtitle="Acompanhe o valor gerado por fábrica e veja o detalhamento por pedido" 
      />

      {/* 1. Cards de Resumo Global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 border-l-4 border-l-blue-500 shadow-sm bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Percent className="w-4 h-4" /> Comissões Geradas
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtBRL(comissoesPrevistas)}</div>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-amber-500 shadow-sm bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Clock className="w-4 h-4" /> Saldo a Receber
          </div>
          <div className="text-2xl font-bold text-amber-600">{fmtBRL(totalAReceber)}</div>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-500 shadow-sm bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <TrendingUp className="w-4 h-4" /> Já Recebido
          </div>
          <div className="text-2xl font-bold text-emerald-600">{fmtBRL(recebido)}</div>
        </Card>

        <Card className="p-5 border-l-4 border-l-rose-500 shadow-sm bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <DollarSign className="w-4 h-4" /> Comissões Vencidas
          </div>
          <div className="text-2xl font-bold text-rose-600">{fmtBRL(vencidas)}</div>
        </Card>
      </div>

      {/* 2. Resumo por Fábrica */}
      {resumoPorFabrica.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Building2 className="w-4 h-4 text-[#075BFF]" /> Acumulado por Representada
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumoPorFabrica.map(r => (
              <div key={r.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  {r.logo ? (
                    <img src={r.logo} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-slate-50 p-1" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{r.nome}</h4>
                    <p className="text-xs text-slate-500">{r.qtdPedidos} pedidos faturados</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Comissão Total:</span> 
                    <span className="font-mono">{fmtBRL(r.totalGerado)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Já Recebido:</span> 
                    <span className="font-mono">{fmtBRL(r.totalRecebido)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 font-bold border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5">
                    <span>A Receber:</span> 
                    <span className="font-mono">{fmtBRL(r.saldoPendente)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Tabela Detalhada por Pedido */}
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
        <ListChecks className="w-4 h-4 text-[#075BFF]" /> Detalhamento dos Pedidos
      </h3>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4 text-left text-slate-600 dark:text-slate-300">Pedido / NF</th>
                <th className="px-5 py-4 text-left text-slate-600 dark:text-slate-300">Representada</th>
                <th className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">Valor Venda</th>
                <th className="px-5 py-4 text-center text-slate-600 dark:text-slate-300">%</th>
                <th className="px-5 py-4 text-right text-emerald-600">Comissão Líquida</th>
                <th className="px-5 py-4 text-right text-amber-600">Saldo Pendente</th>
                <th className="px-5 py-4 text-center text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{c.pedido_numero}</div>
                    <div className="text-[10px] text-slate-500">{c.nf_numero ? `NF: ${c.nf_numero}` : "Sem NF"}</div>
                  </td>
                  <td className="px-5 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {getRepName(c.representada_id)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-500">{fmtBRL(c.valor_total_pedido)}</td>
                  <td className="px-5 py-3 text-center text-slate-500 font-medium">{c.percentual}%</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600">{fmtBRL(c.valor_liquido)}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-amber-600">{fmtBRL(c.saldo_pendente)}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => verParcelas(c)} 
                      className="h-8 border-[#075BFF] text-[#075BFF] hover:bg-[#075BFF]/10"
                    >
                      Ver Parcelas
                    </Button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    Nenhuma comissão gerada até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal de Parcelas (Detalhamento do Contas a Receber) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Parcelas do Pedido {selectedCom?.pedido_numero}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500">Comissão Total</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{fmtBRL(selectedCom?.valor_liquido || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Saldo Pendente</p>
                <p className="text-xl font-bold text-amber-600">{fmtBRL(selectedCom?.saldo_pendente || 0)}</p>
              </div>
            </div>

            <h4 className="text-sm font-semibold mb-2">Parcelas Geradas</h4>
            {loadingParcelas ? (
              <p className="text-sm text-slate-500 text-center py-4">Carregando...</p>
            ) : parcelas.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhuma parcela encontrada no Contas a Receber.</p>
            ) : (
              <div className="space-y-2">
                {parcelas.map((p, i) => (
                  <div key={p.id} className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                    <div>
                      <p className="text-sm font-semibold">Parcela {i + 1}</p>
                      <p className="text-xs text-slate-500">Vencimento: {new Date(p.vencimento).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{fmtBRL(p.valor)}</p>
                      <div className="mt-1">
                        <StatusBadge status={p.status === "recebido" ? "pago" : p.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-slate-500 mt-4 text-center">
              Para dar baixa e registrar o recebimento, acesse a aba <strong>Contas a Receber</strong>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}