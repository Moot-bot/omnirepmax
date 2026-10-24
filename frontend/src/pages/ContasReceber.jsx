import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { fmtBRL, fmtDate } from "../lib/format";
import { CheckCircle2, DollarSign } from "lucide-react";
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

  const getClienteName = (id) => clientes.find(c => c.id === id)?.nome_fantasia || "Cliente";

  const handleOpen = (ar) => {
    setSelectedAR(ar);
    setValorReceber(ar.saldo_pendente || ar.valor);
    setDataRecebimento(new Date().toISOString().split('T')[0]);
    setOpen(true);
  };

  const confirmar = async () => {
    try {
      await api.post(`/contas-receber/${selectedAR.id}/receber`, {
        valor: parseFloat(valorReceber), data: new Date(dataRecebimento).toISOString()
      });
      toast.success("Comissão recebida!"); setOpen(false); load();
    } catch { toast.error("Erro ao registrar"); }
  };

  const totalPendente = list.filter(a => a.status !== "recebido").reduce((acc, a) => acc + (a.saldo_pendente || a.valor), 0);

  return (
    <div className="pb-10">
      <PageHeader title="Contas a Receber (Comissões)" subtitle="Gestão de parcelas e liquidez" />
      
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg inline-block min-w-[300px]">
        <div className="text-sm font-semibold uppercase opacity-90">Comissões Pendentes</div>
        <div className="text-3xl font-bold mt-1">{fmtBRL(totalPendente)}</div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          {/* Correção do Cabeçalho Azul e Dark Mode */}
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="text-left px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Documento / Parcela</th>
              <th className="text-left px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Cliente</th>
              <th className="text-left px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Vencimento</th>
              <th className="text-right px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Valor Comissão</th>
              <th className="text-right px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Recebido</th>
              <th className="text-right px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Saldo</th>
              <th className="text-center px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
              <th className="text-right px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((ar) => (
              <tr key={ar.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-5 py-3">
                  {/* Removido o UUID feio */}
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">{ar.numero_documento}</div>
                </td>
                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{getClienteName(ar.cliente_id)}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{fmtDate(ar.vencimento)}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmtBRL(ar.valor)}</td>
                <td className="px-5 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{fmtBRL(ar.valor_recebido || 0)}</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-500">{fmtBRL(ar.saldo_pendente || ar.valor)}</td>
                <td className="px-5 py-3 text-center"><StatusBadge status={ar.status} /></td>
                <td className="px-5 py-3 text-right">
                  {ar.status !== "recebido" ? (
                    <Button size="sm" onClick={() => handleOpen(ar)} className="bg-[#075BFF] h-8">
                      <DollarSign className="w-3.5 h-3.5 mr-1" /> Baixar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="h-8 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pago
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-slate-500">Nenhuma parcela pendente.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receber Comissão</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400">Saldo Pendente:</p>
              <p className="text-2xl font-bold text-amber-600">{fmtBRL(selectedAR?.saldo_pendente || 0)}</p>
            </div>
            <div className="space-y-1.5"><Label>Valor Recebido</Label><Input type="number" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" step="0.01" value={valorReceber} onChange={e => setValorReceber(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Data</Label><Input type="date" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={dataRecebimento} onChange={e => setDataRecebimento(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={confirmar} className="bg-[#075BFF]">Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}