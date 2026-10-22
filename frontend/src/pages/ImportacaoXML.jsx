import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { FileUp, CheckCircle2, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { fmtBRL, fmtDate } from "../lib/format";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function ImportacaoXML() {
  const [xml, setXml] = useState("");
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [repId, setRepId] = useState("");
  const [cliId, setCliId] = useState("");
  const [historico, setHistorico] = useState([]);

  useEffect(() => { api.get("/xml/historico").then((r) => setHistorico(r.data)); }, [parsed]);

  const importar = async (overrides) => {
    if (!xml.trim()) return toast.error("Cole o XML da NF-e");
    setBusy(true);
    try {
      const body = { xml_content: xml, filename: filename || "manual.xml", create_pedido: true };
      if (overrides?.repId || repId) body.representada_id = overrides?.repId || repId;
      if (overrides?.cliId || cliId) body.cliente_id = overrides?.cliId || cliId;
      const { data } = await api.post("/xml/import", body);
      setParsed(data);
      if (data.pedido_criado) {
        toast.success(`Pedido ${data.pedido_criado.numero} criado automaticamente a partir da NF-e!`);
      } else if (data.pedido_erro === "match_pendente") {
        toast.warning("NF-e processada. Associe representada e cliente para criar o pedido.");
      } else if (data.pedido_erro) {
        toast.error(data.pedido_erro);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erro ao processar XML");
    } finally { setBusy(false); }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFilename(f.name);
    const rd = new FileReader();
    rd.onload = () => setXml(rd.result);
    rd.readAsText(f, "utf-8");
  };

  const needsAssociation = parsed && !parsed.pedido_criado && parsed.pedido_erro === "match_pendente";

  return (
    <div>
      <PageHeader title="Importação XML NF-e" subtitle="Envie o XML da nota — o sistema cria o pedido automaticamente" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <label className="block mb-3">
            <div className="text-sm font-semibold mb-2">1. Enviar arquivo XML da NF-e</div>
            <input data-testid="inp-xml-file" type="file" accept=".xml,text/xml,application/xml" onChange={onFile} className="text-sm block w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900" />
            {filename && <div className="text-xs text-slate-500 mt-2">📎 {filename}</div>}
          </label>
          <div className="text-sm font-semibold mb-2 mt-4">Ou cole o conteúdo:</div>
          <Textarea data-testid="inp-xml-content" rows={6} value={xml} onChange={(e) => setXml(e.target.value)} placeholder="<nfeProc>..." className="font-mono text-xs" />
          <Button data-testid="btn-import-xml" onClick={() => importar()} disabled={busy || !xml.trim()} className="mt-3 bg-[#0A1A3B] hover:bg-[#1E3A8A] text-white">
            {busy ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Processando...</> : <><FileUp className="w-4 h-4 mr-1" />Processar XML e criar pedido</>}
          </Button>
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Histórico ({historico.length})</div>
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {historico.slice(0, 10).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center gap-2 min-w-0"><FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">NF {h.numero || "?"} · {h.emitente?.nome || "—"}</span></div>
                  <div className="font-mono text-slate-500 shrink-0">{fmtBRL(h.valor_total)}</div>
                </div>
              ))}
              {historico.length === 0 && <div className="text-xs text-slate-400">Nenhum XML importado ainda.</div>}
            </div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-sm font-semibold mb-3">2. Dados extraídos</div>
          {!parsed ? <div className="text-sm text-slate-500">Aguardando importação...</div> : (
            <div className="space-y-3 text-sm">
              {parsed.pedido_criado && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Pedido {parsed.pedido_criado.numero} criado!</div>
                    <div className="text-xs mt-0.5">Faturado · {fmtBRL(parsed.pedido_criado.total)} · Comissão {fmtBRL(parsed.pedido_criado.comissao_valor)}</div>
                    <Link to="/pedidos" className="text-xs underline mt-1 inline-block">Ver pedidos →</Link>
                  </div>
                </div>
              )}
              {needsAssociation && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200">
                  <div className="flex items-start gap-2 mb-3"><AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Associação manual necessária</div>
                      <div className="text-xs mt-0.5">
                        {!parsed.representada_match && <>CNPJ emitente <span className="font-mono">{parsed.emitente?.cnpj}</span> não encontrado nas representadas.<br/></>}
                        {!parsed.cliente_match && <>CNPJ destinatário <span className="font-mono">{parsed.destinatario?.cnpj}</span> não encontrado nos clientes.</>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {!parsed.representada_match && (
                      <div><Label className="text-xs">Representada</Label>
                        <Select value={repId} onValueChange={setRepId}>
                          <SelectTrigger data-testid="xml-rep-select" className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>{parsed.representada_sugestoes.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    {!parsed.cliente_match && (
                      <div><Label className="text-xs">Cliente</Label>
                        <Select value={cliId} onValueChange={setCliId}>
                          <SelectTrigger data-testid="xml-cli-select" className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>{parsed.cliente_sugestoes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <Button data-testid="btn-associate-xml" size="sm" disabled={busy || (!parsed.representada_match && !repId) || (!parsed.cliente_match && !cliId)} onClick={() => importar({})} className="mt-3 bg-[#0A1A3B] hover:bg-[#1E3A8A] text-white">Criar pedido com associação</Button>
                </div>
              )}

              <div><div className="text-xs text-slate-500">Emitente (Representada)</div>
                <div className="font-semibold flex items-center gap-2">{parsed.emitente?.nome || "-"} {parsed.representada_match && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}</div>
                <div className="font-mono text-xs">{parsed.emitente?.cnpj}</div>
                {parsed.representada_match && <div className="text-xs text-emerald-600 mt-1">→ {parsed.representada_match.nome_fantasia || parsed.representada_match.razao_social}</div>}
              </div>
              <div><div className="text-xs text-slate-500">Destinatário (Cliente)</div>
                <div className="font-semibold flex items-center gap-2">{parsed.destinatario?.nome || "-"} {parsed.cliente_match && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}</div>
                <div className="font-mono text-xs">{parsed.destinatario?.cnpj}</div>
                {parsed.cliente_match && <div className="text-xs text-emerald-600 mt-1">→ {parsed.cliente_match.nome_fantasia || parsed.cliente_match.razao_social}</div>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><div className="text-xs text-slate-500">NF nº</div><div className="font-mono">{parsed.numero || "-"}</div></div>
                <div><div className="text-xs text-slate-500">Série</div><div className="font-mono">{parsed.serie || "-"}</div></div>
                <div><div className="text-xs text-slate-500">Valor total</div><div className="font-mono font-bold text-[#0A1A3B] dark:text-blue-400">{fmtBRL(parsed.valor_total)}</div></div>
              </div>
              <div><div className="text-xs text-slate-500 mb-1">Itens ({parsed.itens?.length || 0})</div>
                <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-thin">{parsed.itens?.map((i, k) => (
                  <div key={k} className="text-xs flex justify-between border-b border-slate-100 dark:border-slate-800 py-1"><span className="truncate max-w-[60%]">{i.nome}</span><span className="font-mono whitespace-nowrap">{i.quantidade}× {fmtBRL(i.preco)}</span></div>
                ))}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
