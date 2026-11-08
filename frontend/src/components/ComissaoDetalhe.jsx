import React, { useEffect, useState } from "react";
import { Loader2, History, Info, AlertTriangle } from "lucide-react";
import api from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { fmtBRL, fmtDate } from "../lib/format";
import { toast } from "sonner";

/**
 * Detalhe da comissão: dados financeiros, lançamentos em Contas a Receber,
 * troca manual de status (com data e observação) e histórico.
 *
 * Uso em Comissoes.jsx:
 *   <ComissaoDetalhe comissaoId={id} open={!!id} onOpenChange={v => !v && setId(null)} onChanged={load} />
 */
const COR_STATUS = {
  aguardando_liquidez: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  liberada: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  pendente: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  aguardando_pagamento: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  parcialmente_recebida: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  recebida: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  em_atraso: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  cancelada: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};
const ROTULO_LANCAMENTO = {
  aberto: "Em aberto", recebido: "Recebido", cancelado: "Cancelado", aguardando_liquidez: "Aguardando liquidez",
};

export function SeloStatusComissao({ status, label }) {
  return (
    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${COR_STATUS[status] || COR_STATUS.cancelada}`}>
      {label || status}
    </span>
  );
}

export default function ComissaoDetalhe({ comissaoId, open, onOpenChange, onChanged }) {
  const [com, setCom] = useState(null);
  const [opcoes, setOpcoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ status: "", data: "", observacao: "" });

  useEffect(() => {
    if (!open || !comissaoId) return;
    setCarregando(true);
    Promise.all([api.get(`/comissoes/${comissaoId}`), api.get("/comissoes/status-disponiveis")])
      .then(([c, o]) => {
        setCom(c.data); setOpcoes(o.data);
        setForm({ status: "", data: new Date().toISOString().split("T")[0], observacao: "" });
      })
      .catch(e => toast.error(e.response?.data?.detail || "Erro ao carregar a comissão."))
      .finally(() => setCarregando(false));
  }, [open, comissaoId]);

  const statusAtual = com?.status === "pendente" ? "aguardando_pagamento" : com?.status;

  const salvar = async () => {
    if (!form.status) return toast.error("Escolha o novo status.");
    setSalvando(true);
    try {
      const r = await api.post(`/comissoes/${comissaoId}/status`, form);
      setCom(r.data.comissao);
      toast.success("Status atualizado!");
      (r.data.efeitos || []).forEach(msg => toast.info(msg, { duration: 7000 }));
      setForm({ ...form, status: "", observacao: "" });
      onChanged && onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não foi possível alterar o status.");
    } finally { setSalvando(false); }
  };

  const info = (k, v) => (
    <div key={k}>
      <p className="text-xs text-slate-500">{k}</p>
      <p className="font-semibold text-slate-900 dark:text-white">{v}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Comissão {com?.pedido_numero ? `· Pedido ${com.pedido_numero}` : ""}
            {com && <SeloStatusComissao status={com.status} label={com.status_label} />}
          </DialogTitle>
        </DialogHeader>

        {carregando || !com ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#075BFF]" /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {info("Valor da comissão", fmtBRL(com.valor_liquido || 0))}
              {info("Recebido", fmtBRL(com.valor_recebido || 0))}
              {info("Saldo", fmtBRL(com.saldo_pendente || 0))}
              {info("Percentual", `${com.percentual ?? "-"}%`)}
              {info("Valor faturado", fmtBRL(com.valor_faturado || 0))}
              {info("NF", com.nf_numero ? `${com.nf_numero}${com.nf_serie ? "/" + com.nf_serie : ""}` : "—")}
            </div>

            {/* Lançamentos em Contas a Receber */}
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Lançamentos em Contas a Receber</p>
              {(com.lancamentos || []).length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum lançamento.</p>
              ) : (
                <div className="space-y-1">
                  {com.lancamentos.map(l => (
                    <div key={l.id} className="flex flex-wrap justify-between gap-2 text-sm border-b border-slate-100 dark:border-slate-800 py-1.5">
                      <span className="text-slate-600 dark:text-slate-400">{l.numero_documento} · vence {fmtDate(l.vencimento)}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-slate-900 dark:text-white">{fmtBRL(l.valor)}</span>
                        <span className="text-[11px] text-slate-500">{ROTULO_LANCAMENTO[l.status] || l.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alterar status */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Alterar status</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Novo status</Label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white">
                    <option value="">Selecione…</option>
                    {opcoes.filter(o => o.id !== statusAtual).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Data da alteração</Label>
                  <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observação</Label>
                <textarea rows={2} value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })}
                          placeholder="Ex.: fábrica confirmou o recebimento por e-mail"
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 text-sm" />
              </div>
              {["recebida", "parcialmente_recebida"].includes(form.status) && (
                <div className="flex gap-2 text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-lg p-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Mudar o status não registra dinheiro recebido. Para dar baixa, use Contas a Receber.
                </div>
              )}
              {com.status === "aguardando_liquidez" && form.status && form.status !== "cancelada" && (
                <div className="flex gap-2 text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 rounded-lg p-2.5">
                  <Info className="w-4 h-4 shrink-0" />
                  Os lançamentos desta comissão passam a ficar em aberto em Contas a Receber.
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={salvar} disabled={salvando || !form.status} className="bg-[#075BFF] hover:bg-blue-600">
                  {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar status
                </Button>
              </div>
            </div>

            {/* Histórico */}
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2"><History className="w-4 h-4" /> Histórico</p>
              {(com.historico_status || []).length === 0 ? (
                <p className="text-sm text-slate-500">Sem alterações registradas.</p>
              ) : (
                <ol className="space-y-2">
                  {[...com.historico_status].reverse().map((h, i) => (
                    <li key={i} className="text-sm border-l-2 border-[#075BFF]/40 pl-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">{fmtDate(h.data)}</span>
                        {h.de && <><SeloStatusComissao status={h.de} label={opcoes.find(o => o.id === (h.de === "pendente" ? "aguardando_pagamento" : h.de))?.label || h.de} /> →</>}
                        <SeloStatusComissao status={h.para} label={opcoes.find(o => o.id === (h.para === "pendente" ? "aguardando_pagamento" : h.para))?.label || h.para} />
                      </div>
                      {h.observacao && <p className="text-slate-600 dark:text-slate-400 mt-0.5">{h.observacao}</p>}
                      <p className="text-[11px] text-slate-400">{h.usuario || ""}{h.origem && h.origem !== "manual" ? ` · automático (${h.origem.replace("_", " ")})` : ""}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
