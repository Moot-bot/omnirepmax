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
  const [open, setOpen] = useState(false);
  const [selectedAR, setSelectedAR] = useState(null);
  const [valorReceber, setValorReceber] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    const [arRes, cliRes] = await Promise.all([api.get("/contas-receber"), api.get("/clientes")]);
    setList(arRes.data);
    setClientes(cliRes.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getClienteName = (id) => clientes.find(c => c.id === id)?.nome_fantasia || "Cliente Desconhecido";

  const handleOpen = (ar) => {
    setSelectedAR(ar);
    setValorReceber(ar.saldo_pendente || ar.valor);
    setDataRecebimento(new Date().toISOString().split('T')[0]);
    setOpen(true);
  };

  const confirmar = async () => {
    try {
      await api.post(`/contas-receber/${selectedAR.id}/receber`, {
        valor: parseFloat(valorReceber),
        data: new Date(dataRecebimento).toISOString()
      });
      toast.success("Recebimento registrado!");
      setOpen(false);
      load();
    } catch { toast.error("Erro ao registrar"); }
  };

  const totalPendente = list.filter(a => a.status !== "recebido").reduce((acc, a) => acc + (a.saldo_pendente || a.valor), 0);

  return (
    <div className="pb-10">
      <PageHeader title="Contas a Receber" subtitle="Títulos de comissões pendentes" />
      
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg inline-block min-w-[300px]">
        <div className="text-sm font-semibold uppercase opacity-90">Saldo Pendente Total</div>
        <div className="text-3xl font-bold mt-1">{fmtBRL(totalPendente)}</div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/80 border-b">
            <tr>
              <th className="text-left px-5 py-4">Pedido / Doc</th>
              <th className="text-left px-5 py-4">Cliente</th>
              <th className="text-left px-5 py-4">Vencimento</th>
              <th className="text-right px-5 py-4">Valor Original</th>
              <th className="text-right px-5 py-4">Recebido</th>
              <th className="text-right px-5 py-4">Saldo</th>
              <th className="text-center px-5 py-4">Status</th>
              <th className="text-right px-5 py-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((ar) => (
              <tr key={ar.id} className="border-b hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs">{ar.numero_documento}</td>
                <td className="px-5 py-3 font-semibold">{getClienteName(ar.cliente_id)}</td>
                <td className="px-5 py-3">{fmtDate(ar.vencimento)}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-500">{fmtBRL(ar.valor)}</td>
                <td className="px-5 py-3 text-right font-mono text-emerald-600">{fmtBRL(ar.valor_recebido || 0)}</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-amber-600">{fmtBRL(ar.saldo_pendente || ar.valor)}</td>
                <td className="px-5 py-3 text-center"><StatusBadge status={ar.status} /></td>
                <td className="px-5 py-3 text-right">
                  {ar.status !== "recebido" ? (
                    <Button size="sm" onClick={() => handleOpen(ar)} className="bg-[#075BFF] h-8">
                      <DollarSign className="w-3.5 h-3.5 mr-1" /> Baixar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="h-8 text-emerald-600 bg-emerald-50">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pago
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receber Comissão</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-slate-500">Saldo Pendente:</p>
              <p className="text-2xl font-bold text-amber-600">{fmtBRL(selectedAR?.saldo_pendente || 0)}</p>
            </div>
            <div className="space-y-1.5"><Label>Valor Recebido</Label><Input type="number" step="0.01" value={valorReceber} onChange={e => setValorReceber(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={dataRecebimento} onChange={e => setDataRecebimento(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirmar} className="bg-[#075BFF]">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}