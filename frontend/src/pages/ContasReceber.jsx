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

export default function ContasReceber() {
  const [list, setList] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cliente_id: "", numero_documento: "", valor: 0, vencimento: "", status: "aberto", forma_pagamento: "Boleto" });
  const load = async () => setList((await api.get("/contas-receber")).data);
  useEffect(() => { load(); api.get("/clientes").then((r) => setClientes(r.data)); }, []);
  const totalAberto = list.filter((a) => a.status === "aberto").reduce((s, a) => s + a.valor, 0);
  const totalRecebido = list.filter((a) => a.status === "recebido").reduce((s, a) => s + a.valor, 0);
  const clienteName = (id) => clientes.find((c) => c.id === id)?.nome_fantasia || "-";
  const save = async () => { try { await api.post("/contas-receber", form); toast.success("Criado"); setOpen(false); load(); } catch { toast.error("Erro"); } };
  const receber = async (a) => { await api.put(`/contas-receber/${a.id}`, { ...a, status: "recebido", data_recebimento: new Date().toISOString() }); load(); };
  const del = async (a) => {
    if (!window.confirm(`Excluir o título ${a.numero_documento || ""}?`)) return;
    try { await api.delete(`/contas-receber/${a.id}`); toast.success("Título excluído"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Erro ao excluir"); }
  };

  return (
    <div>
      <PageHeader title="Contas a Receber" subtitle="Títulos, vencimentos e recebimentos" actions={<Button data-testid="btn-new-ar" onClick={() => setOpen(true)} className="bg-[#075BFF] hover:bg-[#087BFF]"><Plus className="w-4 h-4 mr-1" />Novo título</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <KpiCard label="Em aberto" value={fmtBRL(totalAberto)} accent="amber" />
        <KpiCard label="Recebido" value={fmtBRL(totalRecebido)} accent="emerald" />
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800"><tr>
            <th className="text-left px-4 py-3">Documento</th><th className="text-left px-4 py-3">Cliente</th>
            <th className="text-right px-4 py-3">Valor</th><th className="text-left px-4 py-3">Vencimento</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Ação</th>
          </tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3 font-mono text-xs">{a.numero_documento}</td>
              <td className="px-4 py-3">{clienteName(a.cliente_id)}</td>
              <td className="px-4 py-3 text-right font-mono">{fmtBRL(a.valor)}</td>
              <td className="px-4 py-3">{fmtDate(a.vencimento)}</td>
              <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  {a.status === "aberto" && <Button size="sm" variant="outline" onClick={() => receber(a)}><Check className="w-3.5 h-3.5" />Baixar</Button>}
                  <Button data-testid={`btn-del-ar-${a.id}`} size="sm" variant="ghost" onClick={() => del(a)} title="Excluir" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </td>
            </tr>
          ))}{list.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Sem títulos.</td></tr>}</tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>Novo título</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Cliente</Label><Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Documento</Label><Input value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Valor</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value || 0) })} /></div>
              <div className="space-y-1"><Label>Vencimento</Label><Input type="date" value={form.vencimento?.substring(0, 10) || ""} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button data-testid="btn-save-ar" onClick={save} className="bg-[#075BFF] hover:bg-[#087BFF]">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
