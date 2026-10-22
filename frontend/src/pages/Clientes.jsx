import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Edit2, Trash2, Search, Building2, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

const empty = { razao_social: "", nome_fantasia: "", cnpj_cpf: "", segmento: "", grupo_economico: "", cidade: "", estado: "", telefone: "", whatsapp: "", email: "", responsavel: "", cargo: "", origem: "", status: "ativo", potencial: "medio", representadas: [], observacoes: "" };

export default function Clientes() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  // Resolve o warning do ESLint
  const load = useCallback(async () => {
    try {
      const params = status !== "all" ? { status } : {};
      const { data } = await api.get("/clientes", { params });
      setList(data);
    } catch {
      toast.error("Erro ao carregar clientes");
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/representadas").then((r) => setReps(r.data)).catch(() => {}); }, []);

  const save = async () => {
    if (!form.razao_social) return toast.error("Razão Social é obrigatória");
    try {
      if (editing) await api.put(`/clientes/${editing}`, form);
      else await api.post("/clientes", form);
      toast.success("Cliente salvo com sucesso!"); 
      setOpen(false); 
      setForm(empty); 
      setEditing(null); 
      load();
    } catch (e) { toast.error("Erro ao salvar cliente"); }
  };

  const edit = (c) => { setForm({ ...empty, ...c }); setEditing(c.id); setOpen(true); };
  const del = async (id) => { 
    if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return; 
    try { await api.delete(`/clientes/${id}`); toast.success("Excluído"); load(); } catch { toast.error("Erro ao excluir"); }
  };

  const filtered = list.filter((c) => {
    const s = q.toLowerCase();
    return !s || (c.razao_social || "").toLowerCase().includes(s) || (c.nome_fantasia || "").toLowerCase().includes(s) || (c.cnpj_cpf || "").includes(s) || (c.cidade || "").toLowerCase().includes(s);
  });

  const toggleRep = (id) => {
    const set = new Set(form.representadas || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    setForm({ ...form, representadas: Array.from(set) });
  };

  return (
    <div className="pb-10">
      <PageHeader 
        title="Clientes" 
        subtitle="CRM completo de varejo, distribuidores e redes" 
        actions={
          <Button onClick={() => { setForm(empty); setEditing(null); setOpen(true); }} className="bg-[#075BFF] hover:bg-[#087BFF] shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" />Novo cliente
          </Button>
        } 
      />
      
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome, CNPJ, cidade..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Cliente</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">CNPJ/CPF</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Localização</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Representadas</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-right px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {(c.nome_fantasia || c.razao_social).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{c.nome_fantasia || c.razao_social}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{c.razao_social}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{c.cnpj_cpf || "-"}</td>
                  <td className="px-5 py-3">
                    {c.cidade ? (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {c.cidade}/{c.estado}
                      </div>
                    ) : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{(c.representadas || []).length}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => edit(c)} className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/20"><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => del(c.id)} className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum cliente encontrado.</p>
                    <p className="text-sm text-slate-400 mt-1">Tente ajustar a busca ou os filtros.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Sessão 1: Dados Principais */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-[#075BFF]" />Dados Principais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2"><Label>Razão Social <span className="text-rose-500">*</span></Label><Input value={form.razao_social || ""} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} placeholder="Ex: Distribuidora Alfa LTDA" /></div>
                <div className="space-y-1.5"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia || ""} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} placeholder="Ex: Alfa Distribuição" /></div>
                <div className="space-y-1.5"><Label>CNPJ / CPF</Label><Input value={form.cnpj_cpf || ""} onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })} placeholder="00.000.000/0000-00" /></div>
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="prospect">Prospect</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Segmento</Label><Input value={form.segmento || ""} onChange={(e) => setForm({ ...form, segmento: e.target.value })} placeholder="Ex: Supermercados" /></div>
              </div>
            </div>

            {/* Sessão 2: Contato e Localização */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#08D5F5]" />Contato e Localização</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 3333-4444" /></div>
                <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 99999-9999" /></div>
                <div className="space-y-1.5"><Label>E-mail</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@empresa.com.br" /></div>
                <div className="space-y-1.5"><Label>Responsável</Label><Input value={form.responsavel || ""} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do comprador" /></div>
                <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.cidade || ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} placeholder="São Paulo" /></div>
                <div className="space-y-1.5"><Label>UF</Label><Input value={form.estado || ""} onChange={(e) => setForm({ ...form, estado: e.target.value })} placeholder="SP" maxLength={2} /></div>
              </div>
            </div>

            {/* Sessão 3: Representadas */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" />Representadas Vinculadas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reps.map((r) => (
                  <label key={r.id} className={`flex items-center gap-2 p-3 rounded-xl border text-sm cursor-pointer transition-colors ${(form.representadas || []).includes(r.id) ? "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                    <input type="checkbox" className="rounded text-blue-500 focus:ring-blue-500" checked={(form.representadas || []).includes(r.id)} onChange={() => toggleRep(r.id)} />
                    <span className="truncate">{r.nome_fantasia || r.razao_social}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sessão 4: Obs */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Anotações sobre este cliente..." className="min-h-[100px]" />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#075BFF] hover:bg-[#087BFF]">Salvar Cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}