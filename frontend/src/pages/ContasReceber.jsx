import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { fmtBRL, fmtDate } from "../lib/format";
import { CheckCircle2, History, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function ContasReceber() {
  const [list, setList] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  // Modal de Recebimento
  const [open, setOpen] = useState(false);
  const [selectedAR, setSelectedAR] = useState(null);
  const [valorReceber, setValorReceber] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    const [arRes, cliRes] = await Promise.all([
      api.get("/contas-receber"),
      api.get("/clientes")
    ]);
    setList(arRes.data);
    setClientes(cliRes.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getClienteName = (id) => clientes.find(c => c.id === id)?.nome_fantasia || "Cliente Desconhecido";

  const handleOpenRecebimento = (ar) => {
    setSelectedAR(ar);
    setValorReceber(ar.saldo_pendente || ar.valor);
    setDataRecebimento(new Date().toISOString().split('T')[0]);
    setOpen(true);
  };

  const confirmarRecebimento = async () => {
    try {
      await api.post(`/contas-receber/${selectedAR.id}/receber`, {
        valor: parseFloat(valorReceber),
        data: new Date(dataRecebimento).toISOString()
      });
      toast.success("Recebimento registrado com sucesso!");
      setOpen(false);
      load(); // Recarrega a lista
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao registrar recebimento");
    }
  };

  const totalPendente = list.filter(a => a.status !== "recebido").reduce((acc, a) => acc + (a.saldo_pendente || a.valor), 0);
  const totalRecebido = list.reduce((acc, a) => acc + (a.valor_recebido || 0), 0);

  return (
    <div className="pb-10">
      <PageHeader 
        title="Contas a Receber" 
        subtitle="Gestão de comissões a receber por pedido faturado" 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg">
          <div className="text-sm font-semibold uppercase opacity-90">Saldo Pendente a Receber</div>
          <div className="text-3xl font-bold mt-1">{fmtBRL(totalPendente)}</div>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
          <div className="text-sm font-semibold uppercase opacity-90">Total Já Recebido</div>
          <div className="text-3xl font-bold mt-1">{fmtBRL(totalRecebido)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="text-left px-5 py-4 font-semibold">Pedido / Doc</th>
                <th className="text-left px-5 py-4 font-semibold">Cliente</th>
                <th className="text-left px-5 py-4 font-semibold">Vencimento</th>
                <th className="text-right px-5 py-4 font-semibold">Comissão Total</th>
                <th className="text-right px-5 py-4 font-semibold">Recebido</th>
                <th className="text-right px-5 py-4 font-semibold">Saldo Pendente</th>
                <th className="text-center px-5 py-4 font-semibold">Status</th>
                <th className="text-right px-5 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((ar) => (
                <tr key={ar.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 group">
                  <td className="px-5 py-3 font-mono text-xs">{ar.numero_documento}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{getClienteName(ar.cliente_id)}</td>
                  <td className="px-5 py-3">{fmtDate(ar.vencimento)}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-500">{fmtBRL(ar.valor)}</td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-600">{fmtBRL(ar.valor_recebido || 0)}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-amber-600">{fmtBRL(ar.saldo_pendente || ar.valor)}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={ar.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {ar.status !== "recebido" ? (
                      <Button size="sm" onClick={() => handleOpenRecebimento(ar)} className="bg-[#075BFF] hover:bg-[#087BFF] h-8">
                        <DollarSign className="w-3.5 h-3.5 mr-1" /> Baixar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="h-8 border-emerald-200 text-emerald-600 bg-emerald-50">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pago
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-slate-500">Nenhuma comissão a receber.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Baixa */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receber Comissão</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-4">
              <p className="text-sm text-slate-500">Saldo Pendente deste título:</p>
              <p className="text-2xl font-bold text-amber-600">{fmtBRL(selectedAR?.saldo_pendente || 0)}</p>
            </div>
            
            <div className="space-y-1.5">
              <Label>Valor Recebido (R$)</Label>
              <Input type="number" step="0.01" value={valorReceber} onChange={e => setValorReceber(e.target.value)} />
              <p className="text-xs text-slate-500">Deixe o valor cheio para quitar, ou menor para baixa parcial.</p>
            </div>
            
            <div className="space-y-1.5">
              <Label>Data do Recebimento</Label>
              <Input type="date" value={dataRecebimento} onChange={e => setDataRecebimento(e.target.value)} />
            </div>

            {selectedAR?.historico_recebimentos?.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <Label className="flex items-center gap-2 mb-2"><History className="w-4 h-4" /> Histórico de Recebimentos</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedAR.historico_recebimentos.map((h, i) => (
                    <div key={i} className="flex justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                      <span>{fmtDate(h.data)}</span>
                      <span className="font-bold text-emerald-600">+ {fmtBRL(h.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarRecebimento} className="bg-[#075BFF]">Confirmar Recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}