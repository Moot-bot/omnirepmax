import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge, KpiCard } from "../components/Common";
import { fmtBRL, fmtDate } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATS = ["Combustível", "Viagem", "Hotel", "Alimentação", "Telefone", "Internet", "Veículo", "Escritório", "Marketing", "Impostos", "Outros"];

export default function ContasPagar() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ descricao: "", categoria: "Outros", fornecedor: "", valor: 0, vencimento: "", status: "aberto", forma_pagamento: "" });
  const load = async () => setList((await api.get("/contas-pagar")).data);
  useEffect(() => { load(); }, []);
  const aberto = list.filter((a) => a.status === "aberto").reduce((s, a) => s + a.valor, 0);
  const pago = list.filter((a) => a.status === "pago").reduce((s, a) => s + a.valor, 0);
  const save = async () => { try { await api.post("/contas-pagar", form); toast.success("Criado"); setOpen(false); load(); } catch { toast.error("Erro"); } };
  const pagar = async (a) => { await api.put(`/contas-pagar/${a.id}`, { ...a, status: "pago", data_pagamento: new Date().toISOString() }); load(); };
  const del = async (a) => {
    if (!window.confirm(`Excluir a despesa "${a.descricao}"?`)) return;
    try { await api.delete(`/contas-pagar/${a.id}`); toast.success("Despesa excluída"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Erro ao excluir"); }
  };

  return (
    <div>
      <PageHeader title="Contas a Pagar" subtitle="Despesas operacionais do representante" actions={<Button data-testid="btn-new-ap" onClick={() => setOpen(true)} className="bg-[#075BFF] hover:bg-[#087BFF]"><Plus className="w-4 h-4 mr-1" />Nova despesa</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <KpiCard label="Em aberto" value={fmtBRL(aberto)} accent="rose" />
        <KpiCard label="Pago" value={fmtBRL(pago)} accent="emerald" />
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800"><tr>
            <th className="text-left px-4 py-3">Descrição</th><th className="text-left px-4 py-3">Categoria</th>
            <th className="text-left px-4 py-3">Fornecedor</th><th className="text-right px-4 py-3">Valor</th>
            <th className="text-left px-4 py-3">Vencimento</th><th className="text-left px-4 py-3">Status</th>
            <th className="text-right px-4 py-3">Ação</th>
          </tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3">{a.descricao}</td>
              <td className="px-4 py-3 text-xs">{a.categoria}</td>
              <td className="px-4 py-3">{a.fornecedor}</td>
              <td className="px-4 py-3 text-right font-mono">{fmtBRL(a.valor)}</td>
              <td className="px-4 py-3">{fmtDate(a.vencimento)}</td>
              <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  {a.status === "aberto" && <Button size="sm" variant="outline" onClick={() => pagar(a)}><Check className="w-3.5 h-3.5" />Baixar</Button>}
                  <Button data-testid={`btn-del-ap-${a.id}`} size="sm" variant="ghost" onClick={() => del(a)} title="Excluir" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>Nova despesa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="space-y-1"><Label>Categoria</Label><Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Valor</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value || 0) })} /></div>
              <div className="space-y-1"><Label>Vencimento</Label><Input type="date" value={form.vencimento?.substring(0, 10) || ""} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button data-testid="btn-save-ap" onClick={save} className="bg-[#075BFF] hover:bg-[#087BFF]">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
