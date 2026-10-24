import React, { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import api from "../lib/api";
import { toast } from "sonner";
import { Plus, History, Calendar, Loader2, CheckCircle2, Clock } from "lucide-react";
import { fmtDate } from "../lib/format";

export default function HistoricoRegrasModal({ open, onClose, representada }) {
  const [regras, setRegras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    comissao_padrao: 5,
    base_calculo_comissao: "faturado",
    modalidade_comissao: "faturamento",
    vigencia_inicio: new Date().toISOString().split("T")[0],
    observacoes: "",
  });

  const load = useCallback(async () => {
    if (!representada) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/representadas/${representada.id}/regras-comissao`);
      setRegras(data);
    } catch { toast.error("Erro ao carregar histórico"); }
    finally { setLoading(false); }
  }, [representada]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const criar = async () => {
    if (!representada) return;
    setBusy(true);
    try {
      await api.post(`/representadas/${representada.id}/regras-comissao`, {
        representada_id: representada.id,
        ...form,
        comissao_padrao: Number(form.comissao_padrao),
      });
      toast.success("Nova vigência criada!");
      setShowForm(false);
      setForm({ ...form, observacoes: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Erro ao criar regra"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Regras — {representada?.nome_fantasia || representada?.razao_social}
        </DialogTitle>
        <DialogDescription className="sr-only">
            Histórico de vigências de comissão desta representada.
        </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} variant="outline" className="w-full border-dashed">
              <Plus className="w-4 h-4 mr-2" /> Criar nova vigência
            </Button>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 space-y-3">
              <p className="text-sm font-semibold">Nova vigência</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Comissão (%)</Label>
                  <Input type="number" step="0.1" value={form.comissao_padrao} onChange={e => setForm({...form, comissao_padrao: e.target.value})} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <Label className="text-xs">Vigência a partir de</Label>
                  <Input type="date" value={form.vigencia_inicio} onChange={e => setForm({...form, vigencia_inicio: e.target.value})} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <Label className="text-xs">Base de cálculo</Label>
                  <Select value={form.base_calculo_comissao} onValueChange={v => setForm({...form, base_calculo_comissao: v})}>
                    <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pedido">Pedido</SelectItem>
                      <SelectItem value="faturado">Faturado</SelectItem>
                      <SelectItem value="recebido">Recebido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Modalidade</Label>
                  <Select value={form.modalidade_comissao} onValueChange={v => setForm({...form, modalidade_comissao: v})}>
                    <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faturamento">Faturamento</SelectItem>
                      <SelectItem value="liquidez">Liquidez</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Input placeholder="Observações (opcional)" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button onClick={criar} disabled={busy} className="bg-[#075BFF]">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-slate-500">Carregando...</div>
          ) : regras.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Nenhuma regra cadastrada. Crie a primeira vigência acima.</div>
          ) : (
            <div className="space-y-2">
              {regras.map((r) => (
                <div key={r.id} className={`border rounded-xl p-3 ${r.vigencia_fim === null ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10" : "border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {r.vigencia_fim === null ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5"/> Vigente</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3.5 h-3.5"/> Encerrada</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3"/> {fmtDate(r.vigencia_inicio)} {r.vigencia_fim ? `→ ${fmtDate(r.vigencia_fim)}` : "(hoje)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><span className="text-slate-500 text-xs">Comissão</span><p className="font-bold text-lg text-[#075BFF]">{r.comissao_padrao}%</p></div>
                    <div><span className="text-slate-500 text-xs">Base</span><p className="font-semibold capitalize">{r.base_calculo_comissao}</p></div>
                    <div><span className="text-slate-500 text-xs">Modalidade</span><p className="font-semibold capitalize">{r.modalidade_comissao}</p></div>
                  </div>
                  {r.observacoes && <p className="text-xs text-slate-500 mt-2 italic">{r.observacoes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}