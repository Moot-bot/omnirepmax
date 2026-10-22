import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { fmtBRL } from "../lib/format";
import { toast } from "sonner";

const ESTAGIOS = [
  { key: "prospeccao", label: "Prospecção" },
  { key: "contato", label: "Contato" },
  { key: "apresentacao", label: "Apresentação" },
  { key: "proposta", label: "Proposta" },
  { key: "negociacao", label: "Negociação" },
  { key: "ganho", label: "Ganhos" },
  { key: "perdido", label: "Perdidos" },
];

export default function Kanban() {
  const [ops, setOps] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [reps, setReps] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: "", cliente_id: "", representada_id: "", valor_estimado: 0, probabilidade: 50, estagio: "prospeccao", proxima_acao: "" });
  const load = async () => setOps((await api.get("/oportunidades")).data);
  useEffect(() => { load(); api.get("/clientes").then((r) => setClientes(r.data)); api.get("/representadas").then((r) => setReps(r.data)); }, []);
  const clienteName = (id) => clientes.find((c) => c.id === id)?.nome_fantasia || clientes.find((c) => c.id === id)?.razao_social || "-";
  const onDrop = async (e, est) => { const id = e.dataTransfer.getData("id"); if (!id) return; await api.patch(`/oportunidades/${id}/estagio`, { estagio: est }); load(); };
  const save = async () => { try { await api.post("/oportunidades", form); toast.success("Criada"); setOpen(false); setForm({ titulo: "", cliente_id: "", representada_id: "", valor_estimado: 0, probabilidade: 50, estagio: "prospeccao", proxima_acao: "" }); load(); } catch { toast.error("Erro"); } };
  const del = async (o, e) => {
    e.stopPropagation();
    if (!window.confirm(`Excluir a oportunidade "${o.titulo}"?`)) return;
    try { await api.delete(`/oportunidades/${o.id}`); toast.success("Oportunidade excluída"); load(); }
    catch (err) { toast.error(err?.response?.data?.detail || "Erro ao excluir"); }
  };

  return (
    <div>
      <PageHeader title="Funil de Vendas" subtitle="Arraste as oportunidades entre etapas" actions={
        <Button data-testid="btn-new-oportunidade" onClick={() => setOpen(true)} className="bg-[#075BFF] hover:bg-[#087BFF]"><Plus className="w-4 h-4 mr-1" />Nova oportunidade</Button>
      } />
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
        {ESTAGIOS.map((s) => {
          const items = ops.filter((o) => o.estagio === s.key);
          const total = items.reduce((a, b) => a + (b.valor_estimado || 0), 0);
          return (
            <div key={s.key} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, s.key)} className="min-w-[280px] flex-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-sm">{s.label}</div>
                <div className="text-xs text-slate-500 font-mono">{items.length}</div>
              </div>
              <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 mb-3">{fmtBRL(total)}</div>
              <div className="space-y-2">
                {items.map((o) => (
                  <div key={o.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", o.id)} data-testid={`op-card-${o.id}`} className="group p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 cursor-move hover:shadow-md transition-shadow relative">
                    <button
                      data-testid={`btn-del-op-${o.id}`}
                      onClick={(e) => del(o, e)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute top-1.5 right-1.5 p-1 rounded text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-opacity"
                      title="Excluir oportunidade"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-sm font-semibold line-clamp-2 pr-6">{o.titulo}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{clienteName(o.cliente_id)}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">{fmtBRL(o.valor_estimado)}</div>
                      <div className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{o.probabilidade}%</div>
                    </div>
                    {o.proxima_acao && <div className="text-[11px] text-slate-500 mt-1">→ {o.proxima_acao}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova oportunidade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Título</Label><Input data-testid="op-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="space-y-1"><Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger data-testid="op-cliente"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Representada</Label>
              <Select value={form.representada_id} onValueChange={(v) => setForm({ ...form, representada_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome_fantasia}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Valor estimado</Label><Input type="number" step="0.01" value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: parseFloat(e.target.value || 0) })} /></div>
              <div className="space-y-1"><Label>Probabilidade %</Label><Input type="number" value={form.probabilidade} onChange={(e) => setForm({ ...form, probabilidade: parseInt(e.target.value || 0) })} /></div>
            </div>
            <div className="space-y-1"><Label>Próxima ação</Label><Input value={form.proxima_acao} onChange={(e) => setForm({ ...form, proxima_acao: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button data-testid="btn-save-op" onClick={save} className="bg-[#075BFF] hover:bg-[#087BFF]">Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
