import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { LogoUpload } from "../components/LogoUpload";
import { Plus, Edit2, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { fmtNum } from "../lib/format";

const empty = { razao_social: "", nome_fantasia: "", cnpj: "", inscricao_estadual: "", segmento: "", cidade: "", estado: "", telefone: "", whatsapp: "", email: "", contato_nome: "", contato_cargo: "", comissao_padrao: 5.0, prazo_pagamento: "30 dias", observacoes: "" };

export default function Representadas() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const load = async () => { const { data } = await api.get("/representadas"); setList(data); };
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (editing) await api.put(`/representadas/${editing}`, form);
      else await api.post("/representadas", form);
      toast.success("Salvo!"); setOpen(false); setForm(empty); setEditing(null); load();
    } catch (e) { toast.error("Erro ao salvar"); }
  };
  const edit = (r) => { setForm({ ...empty, ...r }); setEditing(r.id); setOpen(true); };
  const del = async (id) => { if (!window.confirm("Excluir representada?")) return; await api.delete(`/representadas/${id}`); toast.success("Excluído"); load(); };

  return (
    <div>
      <PageHeader title="Representadas" subtitle="Indústrias e marcas que você representa" actions={
        <Button data-testid="btn-new-representada" onClick={() => { setForm(empty); setEditing(null); setOpen(true); }} className="bg-[#075BFF] hover:bg-[#087BFF]"><Plus className="w-4 h-4 mr-1" />Nova representada</Button>
      } />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((r) => (
          <div key={r.id} data-testid={`representada-card-${r.id}`} className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              {r.logo ? (
                <img src={r.logo} alt="logo" className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white"><Building2 className="w-6 h-6" /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-lg truncate">{r.nome_fantasia || r.razao_social}</div>
                <div className="text-xs text-slate-500 truncate">{r.razao_social}</div>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">CNPJ</span><span className="font-mono text-xs">{r.cnpj || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Segmento</span><span>{r.segmento || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cidade</span><span>{r.cidade}/{r.estado}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Comissão</span><span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{fmtNum(r.comissao_padrao, 1)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Prazo</span><span className="text-xs">{r.prazo_pagamento}</span></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => edit(r)} data-testid={`btn-edit-representada-${r.id}`}><Edit2 className="w-3.5 h-3.5" /></Button>
              <Button variant="outline" size="sm" onClick={() => del(r.id)} data-testid={`btn-del-representada-${r.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} representada</DialogTitle></DialogHeader>
          <div className="mb-4"><LogoUpload value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} label="Logo da representada" testId="inp-logo-representada" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[["razao_social", "Razão Social"], ["nome_fantasia", "Nome Fantasia"], ["cnpj", "CNPJ"], ["inscricao_estadual", "Inscrição Estadual"], ["segmento", "Segmento"], ["cidade", "Cidade"], ["estado", "Estado (UF)"], ["cep", "CEP"], ["telefone", "Telefone"], ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["site", "Site"], ["contato_nome", "Contato"], ["contato_cargo", "Cargo do contato"], ["prazo_pagamento", "Prazo médio"]].map(([k, l]) => (
              <div key={k} className="space-y-1"><Label>{l}</Label><Input data-testid={`inp-${k}`} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
            <div className="space-y-1"><Label>Comissão padrão (%)</Label><Input type="number" step="0.1" data-testid="inp-comissao_padrao" value={form.comissao_padrao} onChange={(e) => setForm({ ...form, comissao_padrao: parseFloat(e.target.value || 0) })} /></div>
            <div className="sm:col-span-2 space-y-1"><Label>Observações</Label><Textarea data-testid="inp-observacoes" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button data-testid="btn-save-representada" onClick={save} className="bg-[#075BFF] hover:bg-[#087BFF]">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
