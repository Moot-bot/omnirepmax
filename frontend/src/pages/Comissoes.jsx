import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { fmtBRL, fmtDate } from "../lib/format";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Percent, TrendingUp, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Comissoes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCom, setSelectedCom] = useState(null);
  const [formBaixa, setFormBaixa] = useState({ valor: "", data: "", forma: "PIX", comprovante: "", obs: "" });

  const load = useCallback(async () => {
    const res = await api.get("/comissoes");
    setList(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Cálculos do Resumo
  const comissoesPrevistas = list.reduce((acc, c) => acc + c.valor_bruto, 0);
  const totalAReceber = list.reduce((acc, c) => acc + c.saldo_pendente, 0);
  const recebido = list.reduce((acc, c) => acc + c.valor_recebido, 0);
  const hoje = new Date();
  const vencidas = list.filter(c => c.status !== "recebida" && new Date(c.data_prevista) < hoje).reduce((acc, c) => acc + c.saldo_pendente, 0);

  const abrirBaixa = (com) => {
    setSelectedCom(com);
    setFormBaixa({ valor: com.saldo_pendente, data: new Date().toISOString().split('T')[0], forma: "PIX", comprovante: "", obs: "" });
    setModalOpen(true);
  };

  const realizarBaixa = async () => {
    try {
      await api.post(`/contas-receber/${selectedCom.id}/receber`, {
        valor: parseFloat(formBaixa.valor),
        data: new Date(formBaixa.data).toISOString()
      });
      toast.success("Baixa realizada com sucesso!");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error("Erro ao realizar baixa.");
    }
  };

  return (
    <div className="pb-10">
      <PageHeader title="Gestão de Comissões" subtitle="Acompanhe as comissões geradas e realize baixas manuais" />

      {/* 4 Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1"><Percent className="w-4 h-4" /> Comissões Previstas</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{fmtBRL(comissoesPrevistas)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1"><Clock className="w-4 h-4" /> Total a Receber</div>
          <div className="text-xl font-bold text-amber-600">{fmtBRL(totalAReceber)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1"><TrendingUp className="w-4 h-4" /> Recebido Acumulado</div>
          <div className="text-xl font-bold text-emerald-600">{fmtBRL(recebido)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-rose-500 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1"><DollarSign className="w-4 h-4" /> Comissões Vencidas</div>
          <div className="text-xl font-bold text-rose-600">{fmtBRL(vencidas)}</div>
        </Card>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b">
              <tr>
                <th className="px-4 py-4 text-left">Pedido / NF</th>
                <th className="px-4 py-4 text-left">Cliente</th>
                <th className="px-4 py-4 text-right">Valor Pedido</th>
                <th className="px-4 py-4 text-center">Base Cálculo</th>
                <th className="px-4 py-4 text-right">Comissão Bruta</th>
                <th className="px-4 py-4 text-center">%</th>
                <th className="px-4 py-4 text-right text-emerald-600">Comissão Líquida</th>
                <th className="px-4 py-4 text-right text-amber-600">Saldo Pendente</th>
                <th className="px-4 py-4 text-center">Vencimento</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold">{c.pedido_numero}</div>
                    <div className="text-xs text-slate-500">{c.nf_numero ? `NF: ${c.nf_numero}` : "Sem NF"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{c.cliente_id?.substring(0,8)}...</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">{fmtBRL(c.valor_total_pedido)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{fmtBRL(c.base_calculo)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">{fmtBRL(c.valor_bruto)}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{c.percentual}%</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{fmtBRL(c.valor_liquido)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">{fmtBRL(c.saldo_pendente)}</td>
                  <td className="px-4 py-3 text-center">{fmtDate(c.data_prevista)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {c.status !== "recebida" && (
                      <Button size="sm" onClick={() => abrirBaixa(c)} className="bg-[#075BFF] hover:bg-[#087BFF] h-8">
                        <DollarSign className="w-3.5 h-3.5 mr-1" /> Baixar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && !loading && (
                <tr><td colSpan={11} className="text-center py-10 text-slate-500">Nenhuma comissão gerada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Baixa Manual */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Baixa Manual de Comissão</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-4">
              <p className="text-sm text-slate-500">Saldo Pendente:</p>
              <p className="text-2xl font-bold text-amber-600">{fmtBRL(selectedCom?.saldo_pendente || 0)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor a Receber (R$)</Label>
                <Input type="number" step="0.01" value={formBaixa.valor} onChange={e => setFormBaixa({...formBaixa, valor: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Data do Recebimento</Label>
                <Input type="date" value={formBaixa.data} onChange={e => setFormBaixa({...formBaixa, data: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de Recebimento</Label>
                <Input value={formBaixa.forma} onChange={e => setFormBaixa({...formBaixa, forma: e.target.value})} placeholder="PIX, TED..." />
              </div>
              <div className="space-y-1.5">
                <Label>Comprovante / Ref</Label>
                <Input value={formBaixa.comprovante} onChange={e => setFormBaixa({...formBaixa, comprovante: e.target.value})} placeholder="Nº do doc" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input value={formBaixa.obs} onChange={e => setFormBaixa({...formBaixa, obs: e.target.value})} placeholder="Opcional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={realizarBaixa} className="bg-[#075BFF]">Confirmar Baixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}