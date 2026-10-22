import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  Plus, Calendar as CalendarIcon, Trash2, 
  MapPin, Video, Phone, MessageCircle, Mail, RefreshCw, CalendarX 
} from "lucide-react";
import { fmtDate } from "../lib/format";
import { toast } from "sonner";

// Adicionado ícone e cor para cada tipo
const TIPOS = [
  { id: "visita", label: "Visita presencial", icon: MapPin, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "reuniao_online", label: "Reunião online", icon: Video, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "ligacao", label: "Ligação", icon: Phone, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-500", bg: "bg-green-500/10" },
  { id: "email", label: "E-mail", icon: Mail, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "follow_up", label: "Follow-up", icon: RefreshCw, color: "text-cyan-500", bg: "bg-cyan-500/10" }
];

export default function Agenda() {
  const [list, setList] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cliente_id: "", tipo: "visita", data: "", horario: "", objetivo: "", status: "agendada" });

  // Uso do useCallback para evitar o Warning no terminal
  const load = useCallback(async () => {
    try {
      const res = await api.get("/visitas");
      setList(res.data);
    } catch {
      toast.error("Erro ao carregar agenda");
    }
  }, []);

  useEffect(() => {
    load();
    api.get("/clientes").then((r) => setClientes(r.data)).catch(() => {});
  }, [load]);

  const getClienteName = (id) => clientes.find((c) => c.id === id)?.nome_fantasia || "-";

  const save = async () => {
    if (!form.cliente_id || !form.data) return toast.error("Preencha os campos obrigatórios");
    try {
      await api.post("/visitas", { 
        ...form, 
        data: form.data ? new Date(form.data).toISOString() : new Date().toISOString() 
      });
      toast.success("Atividade agendada");
      setOpen(false);
      load();
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const del = async (v) => {
    if (!window.confirm(`Excluir esta atividade com ${getClienteName(v.cliente_id)}?`)) return;
    try {
      await api.delete(`/visitas/${v.id}`);
      toast.success("Atividade excluída");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erro ao excluir");
    }
  };

  return (
    <div className="pb-10">
      <PageHeader 
        title="Agenda & Visitas" 
        subtitle="Compromissos comerciais e follow-ups" 
        actions={
          <Button onClick={() => setOpen(true)} className="bg-[#075BFF] hover:bg-[#087BFF] shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" />Nova atividade
          </Button>
        } 
      />

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
          <CalendarX className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Nenhuma atividade agendada</h3>
          <p className="text-sm text-slate-500 mb-4">Que tal agendar uma visita ou ligação para um cliente?</p>
          <Button variant="outline" onClick={() => setOpen(true)} className="border-[#075BFF] text-[#075BFF] hover:bg-[#075BFF]/10">
            Agendar agora
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((v) => {
            const tipoInfo = TIPOS.find(t => t.id === v.tipo) || TIPOS[0];
            const Icone = tipoInfo.icon;
            
            return (
              <div key={v.id} className="group relative p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-[#075BFF]/30">
                
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${tipoInfo.bg} ${tipoInfo.color}`}>
                      <Icone className="w-4 h-4 shrink-0" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{tipoInfo.label}</div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                        {fmtDate(v.data)} {v.horario && `às ${v.horario}`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Botão de deletar só aparece no hover do card */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => del(v)} 
                    className="h-8 w-8 p-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mt-4">
                  <div className="text-xs text-slate-400 mb-1">Cliente</div>
                  <div className="font-semibold text-base text-slate-900 dark:text-white truncate">
                    {getClienteName(v.cliente_id)}
                  </div>
                </div>

                {v.objetivo && (
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    "{v.objetivo}"
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <StatusBadge status={v.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Nova Atividade */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cliente <span className="text-rose-500">*</span></Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de contato</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data <span className="text-rose-500">*</span></Label>
                <Input type="date" value={form.data?.substring(0, 10) || ""} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Objetivo / Pauta</Label>
              <Input placeholder="Ex: Apresentar nova linha de produtos" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#075BFF] hover:bg-[#087BFF]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}