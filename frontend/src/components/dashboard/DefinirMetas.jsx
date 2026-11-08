import React, { useEffect, useState } from "react";
import { Loader2, Pencil, Trash2, Target } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { brl, mascaraMoeda, moedaParaExibicao } from "../../lib/dashboardComercial";
import { toast } from "sonner";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const selCls = "w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white";

/**
 * Cadastro e edição de metas. Salvar a mesma combinação (ano, mês, representada, rede) atualiza a meta existente.
 */
export default function DefinirMetas({ open, onOpenChange, ano, mes, representadas = [], redes = [], inicial = {}, onSalvo, podeEditar = true }) {
  const [form, setForm] = useState({ ano, mes, representada_id: "", rede: "", valor: 0, exibicao: "" });
  const [metas, setMetas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const carregar = async (a, m) => {
    setCarregando(true);
    try { setMetas((await api.get("/metas", { params: { ano: a, mes: m } })).data); }
    catch { setMetas([]); }
    finally { setCarregando(false); }
  };

  useEffect(() => {
    if (!open) return;
    const f = { ano, mes, representada_id: inicial.representada_id || "", rede: inicial.rede || "", valor: 0, exibicao: "" };
    setForm(f); carregar(ano, mes);
  }, [open]); // eslint-disable-line

  // ao trocar a combinação, mostra o valor já cadastrado (vira "Editar")
  const existente = metas.find(m => (m.representada_id || "") === (form.representada_id || "")
    && (m.rede || "").toLowerCase() === (form.rede || "").toLowerCase());
  useEffect(() => {
    if (existente) setForm(f => ({ ...f, valor: existente.valor, exibicao: moedaParaExibicao(existente.valor) }));
  }, [existente?.id]); // eslint-disable-line

  const mudarPeriodo = (campo, v) => {
    const f = { ...form, [campo]: Number(v), valor: 0, exibicao: "" };
    setForm(f); carregar(f.ano, f.mes);
  };

  const salvar = async () => {
    if (!form.valor || form.valor <= 0) return toast.error("Informe o valor da meta.");
    setSalvando(true);
    try {
      await api.put("/metas", { ano: form.ano, mes: form.mes, representada_id: form.representada_id || null, rede: form.rede || null, valor: form.valor });
      toast.success(existente ? "Meta atualizada!" : "Meta cadastrada!");
      await carregar(form.ano, form.mes);
      onSalvo && onSalvo();
    } catch (e) { toast.error(e.response?.data?.detail || "Não foi possível salvar a meta."); }
    finally { setSalvando(false); }
  };

  const excluir = async (m) => {
    if (!window.confirm("Excluir esta meta?")) return;
    try { await api.delete(`/metas/${m.id}`); toast.success("Meta excluída."); await carregar(form.ano, form.mes); onSalvo && onSalvo(); }
    catch (e) { toast.error(e.response?.data?.detail || "Não foi possível excluir."); }
  };

  const editar = (m) => setForm({ ...form, representada_id: m.representada_id || "", rede: m.rede || "", valor: m.valor, exibicao: moedaParaExibicao(m.valor) });
  const nomeRep = (id) => representadas.find(r => r.id === id)?.nome || "—";
  const anoAtual = new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-[#075BFF]" /> Metas comerciais</DialogTitle></DialogHeader>

        {podeEditar ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <select className={selCls} value={form.ano} onChange={e => mudarPeriodo("ano", e.target.value)}>
                  {[anoAtual - 1, anoAtual, anoAtual + 1].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Mês</Label>
                <select className={selCls} value={form.mes} onChange={e => mudarPeriodo("mes", e.target.value)}>
                  {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Representada</Label>
                <select className={selCls} value={form.representada_id} onChange={e => setForm({ ...form, representada_id: e.target.value, valor: 0, exibicao: "" })}>
                  <option value="">Todas (meta geral)</option>
                  {representadas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Rede</Label>
                <select className={selCls} value={form.rede} onChange={e => setForm({ ...form, rede: e.target.value, valor: 0, exibicao: "" })}>
                  <option value="">Todas as redes</option>
                  {redes.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1.5 flex-1">
                <Label>Valor da meta</Label>
                <Input inputMode="numeric" placeholder="R$ 0,00" value={form.exibicao}
                       onChange={e => { const m = mascaraMoeda(e.target.value); setForm({ ...form, valor: m.valor, exibicao: m.exibicao }); }}
                       className="text-lg font-semibold tabular-nums" />
              </div>
              <Button onClick={salvar} disabled={salvando} className="bg-[#075BFF] hover:bg-blue-600 h-10">
                {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {existente ? "Salvar alteração" : "Salvar meta"}
              </Button>
            </div>
            {existente && <p className="text-xs text-slate-500">Já existe meta para esta combinação — salvar vai atualizar o valor.</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Apenas gestores e administradores podem cadastrar ou alterar metas.</p>
        )}

        <div className="pt-2">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Metas de {MESES[form.mes - 1]} de {form.ano}</p>
          {carregando ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : metas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma meta cadastrada para este mês.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {metas.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {!m.representada_id && !m.rede ? <b>Meta geral</b> : <>{m.representada_id ? nomeRep(m.representada_id) : "Todas as representadas"}{m.rede ? ` · ${m.rede}` : ""}</>}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white mr-2">{brl(m.valor)}</span>
                    {podeEditar && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => editar(m)} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => excluir(m)} title="Excluir" className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-3">
            Sem filtros, o painel usa a meta geral; se não houver, soma as metas por representada. Metas gerais e específicas nunca são somadas entre si.
          </p>
        </div>

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
