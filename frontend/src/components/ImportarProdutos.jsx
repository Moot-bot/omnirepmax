import React, { useEffect, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Download, Loader2, AlertTriangle, CheckCircle2, Undo2, X } from "lucide-react";
import api from "../lib/api";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { fmtBRL } from "../lib/format";
import { toast } from "sonner";
import {
  lerPlanilha, semRepetidos, lerPreco, baixarModeloXLSX, baixarModeloCSV, baixarRelatorioErros,
} from "../lib/planilhaProdutos";

/**
 * Modal de importação de produtos de uma representada.
 * Uso em Representadas.jsx:
 *   <ImportarProdutos open={aberto} onOpenChange={setAberto}
 *                     representadas={reps} representadaId={rep?.id} onImported={load} />
 */
const LOTE = 1000;
const MAX_MB = 25;

export default function ImportarProdutos({ open, onOpenChange, representadas = [], representadaId, onImported }) {
  const [repId, setRepId] = useState(representadaId || "");
  const [modo, setModo] = useState("atualizar");
  const [arquivo, setArquivo] = useState(null);
  const [leitura, setLeitura] = useState(null);     // { aba, linhaCabecalho, colunasFaltando, linhas }
  const [analise, setAnalise] = useState(null);     // resposta da simulação
  const [erroLeitura, setErroLeitura] = useState("");
  const [etapa, setEtapa] = useState("escolher");   // escolher | analisando | previa | importando | concluido
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (open) { setRepId(representadaId || ""); limpar(); } }, [open, representadaId]); // eslint-disable-line

  const limpar = () => {
    setArquivo(null); setLeitura(null); setAnalise(null); setErroLeitura("");
    setEtapa("escolher"); setProgresso(0); setResultado(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const analisar = async (file, rep = repId, modoAtual = modo) => {
    if (!file) return;
    setArquivo(file); setErroLeitura(""); setAnalise(null); setResultado(null);
    if (file.size > MAX_MB * 1024 * 1024) { setErroLeitura(`Arquivo maior que ${MAX_MB} MB. Divida a planilha.`); return; }
    if (!rep) { setErroLeitura("Selecione a representada antes de escolher o arquivo."); return; }
    setEtapa("analisando");
    try {
      const lido = lerPlanilha(file.name, await file.arrayBuffer());
      if (lido.linhas.length === 0) throw new Error(`Nenhuma linha de produto encontrada abaixo do cabeçalho (linha ${lido.linhaCabecalho}).`);
      setLeitura(lido);
      const r = await api.post("/produtos/importar", { representada_id: rep, modo: modoAtual, simular: true, produtos: lido.linhas });
      setAnalise(r.data);
      setEtapa("previa");
    } catch (e) {
      setErroLeitura(e.response?.data?.detail || e.message || "Não foi possível ler o arquivo.");
      setEtapa("escolher");
    }
  };

  // refaz a análise se trocar a representada ou o modo depois de escolher o arquivo
  useEffect(() => {
    if (arquivo && (etapa === "previa" || etapa === "escolher") && leitura) analisar(arquivo, repId, modo);
  }, [repId, modo]); // eslint-disable-line

  const confirmar = async () => {
    const linhas = semRepetidos(leitura.linhas);
    const importId = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    setEtapa("importando"); setProgresso(0);
    const tot = { criados: 0, atualizados: 0, ignorados: 0, erros: [] };
    try {
      for (let i = 0; i < linhas.length; i += LOTE) {
        const r = await api.post("/produtos/importar", {
          representada_id: repId, modo, simular: false, import_id: importId, produtos: linhas.slice(i, i + LOTE),
        });
        tot.criados += r.data.criados; tot.atualizados += r.data.atualizados; tot.ignorados += r.data.ignorados;
        tot.erros.push(...(r.data.erros || []));
        setProgresso(Math.round(Math.min(100, ((i + LOTE) / linhas.length) * 100)));
      }
      setResultado({ ...tot, importId, ok: true });
      setEtapa("concluido");
      toast.success(`Importação concluída: ${tot.criados} criados, ${tot.atualizados} atualizados.`);
      onImported && onImported();
    } catch (e) {
      setResultado({ ...tot, importId, ok: false, falha: e.response?.data?.detail || e.message });
      setEtapa("concluido");
      onImported && onImported();
    }
  };

  const desfazer = async () => {
    try {
      const r = await api.post(`/produtos/importar/${resultado.importId}/desfazer`);
      toast.success(`Importação desfeita: ${r.data.removidos} removidos, ${r.data.restaurados} restaurados.`);
      onImported && onImported();
      limpar();
    } catch (e) { toast.error(e.response?.data?.detail || "Não foi possível desfazer."); }
  };

  const soltar = (e) => {
    e.preventDefault(); setArrastando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) analisar(f);
  };

  const rs = analise?.resumo;
  const erros = analise?.erros || [];
  const podeConfirmar = etapa === "previa" && rs && rs.validos > 0 && (rs.a_criar + rs.a_atualizar) > 0;
  const card = (rotulo, valor, cor = "text-slate-900 dark:text-white") => (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
      <p className="text-[11px] text-slate-500 uppercase tracking-wide">{rotulo}</p>
      <p className={`text-xl font-bold ${cor}`}>{valor}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (etapa !== "importando") onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar produtos</DialogTitle></DialogHeader>

        <div className="space-y-4">
          {/* Representada + modo */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Representada</Label>
              <select value={repId} onChange={e => setRepId(e.target.value)} disabled={etapa === "importando"}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white">
                <option value="">Selecione…</option>
                {representadas.map(r => <option key={r.id} value={r.id}>{r.nome_fantasia || r.razao_social}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Produtos que já existem (mesmo Código ou EAN)</Label>
              <div className="flex gap-2">
                {[["atualizar", "Atualizar existentes"], ["ignorar", "Ignorar existentes"]].map(([v, r]) => (
                  <button key={v} type="button" disabled={etapa === "importando"} onClick={() => setModo(v)}
                          className={`flex-1 h-10 rounded-md text-sm border transition-colors ${modo === v
                            ? "bg-[#075BFF] border-[#075BFF] text-white"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>{r}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Área de upload */}
          {etapa !== "concluido" && (
            <div onDragOver={e => { e.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)} onDrop={soltar}
                 onClick={() => etapa !== "importando" && inputRef.current?.click()}
                 className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${arrastando
                   ? "border-[#075BFF] bg-[#075BFF]/5" : "border-slate-300 dark:border-slate-700 hover:border-[#075BFF]"}`}>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden"
                     onChange={e => analisar(e.target.files?.[0])} />
              {etapa === "analisando" ? (
                <div className="flex flex-col items-center gap-2 text-slate-500"><Loader2 className="w-8 h-8 animate-spin text-[#075BFF]" /> Lendo e conferindo a planilha…</div>
              ) : arquivo ? (
                <div className="flex flex-col items-center gap-1">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <p className="font-semibold text-slate-900 dark:text-white break-all">{arquivo.name}</p>
                  <p className="text-xs text-slate-500">Clique ou arraste outro arquivo para trocar</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-500">
                  <UploadCloud className="w-8 h-8" />
                  <p className="font-medium text-slate-700 dark:text-slate-300">Arraste a planilha aqui ou clique para escolher</p>
                  <p className="text-xs">Excel (.xlsx, .xls) ou CSV separado por ; ou ,</p>
                </div>
              )}
            </div>
          )}

          {/* Colunas esperadas + modelo */}
          {etapa === "escolher" && (
            <div className="text-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Colunas esperadas na planilha</p>
                <p className="text-slate-600 dark:text-slate-400"><b>Nome</b> (obrigatório), Código, EAN, Marca, Categoria, Preço, Unidade.</p>
                <p className="text-xs text-slate-500 mt-1">Também aceita: Descrição/Produto, Cod/Referência, Código de barras/GTIN, Valor/Preço unitário, UN/Und.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={baixarModeloXLSX}><Download className="w-4 h-4 mr-2" /> Baixar modelo de planilha (.xlsx)</Button>
                <Button type="button" variant="ghost" size="sm" onClick={baixarModeloCSV}>Modelo .csv</Button>
              </div>
            </div>
          )}

          {erroLeitura && (
            <div className="flex gap-2 text-sm bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{erroLeitura}</span>
            </div>
          )}

          {/* Prévia */}
          {etapa === "previa" && rs && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                {leitura.aba ? `Aba "${leitura.aba}", ` : ""}cabeçalho na linha {leitura.linhaCabecalho}.
                {leitura.colunasFaltando.length > 0 && ` Colunas ausentes (opcionais): ${leitura.colunasFaltando.join(", ")}.`}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {card("Válidos", rs.validos, "text-emerald-600")}
                {card("Com erro", rs.com_erro, rs.com_erro ? "text-rose-600" : undefined)}
                {card("Repetidos no arquivo", rs.duplicados_no_arquivo)}
                {card(modo === "atualizar" ? "Serão atualizados" : "Serão ignorados", modo === "atualizar" ? rs.a_atualizar : rs.a_ignorar)}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Serão <b>criados {rs.a_criar}</b> produtos{modo === "atualizar" ? <> e <b>atualizados {rs.a_atualizar}</b></> : <> e <b>ignorados {rs.a_ignorar}</b> já existentes</>}.
                {rs.sem_codigo_nem_ean > 0 && ` ${rs.sem_codigo_nem_ean} sem Código nem EAN serão sempre criados (não há como saber se já existem).`}
              </p>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs min-w-[640px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>{["Linha", "Nome", "Código", "EAN", "Marca", "Preço", "Un."].map(h => <th key={h} className="px-2 py-2 text-left font-semibold text-slate-500">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {leitura.linhas.slice(0, 10).map(l => {
                      const preco = lerPreco(l.preco);
                      const erro = erros.find(e => e.linha === l.linha);
                      return (
                        <tr key={l.linha} className={`border-t border-slate-100 dark:border-slate-800 ${erro ? "bg-rose-50 dark:bg-rose-500/10" : ""}`} title={erro?.motivo}>
                          <td className="px-2 py-1.5 text-slate-500">{l.linha}</td>
                          <td className="px-2 py-1.5 text-slate-900 dark:text-white">{l.nome || <span className="text-rose-600">(vazio)</span>}</td>
                          <td className="px-2 py-1.5 font-mono">{l.codigo}</td>
                          <td className="px-2 py-1.5 font-mono">{l.ean}</td>
                          <td className="px-2 py-1.5">{l.marca}</td>
                          <td className="px-2 py-1.5 font-mono">{preco === null ? <span className="text-rose-600">{String(l.preco)}</span> : fmtBRL(preco)}</td>
                          <td className="px-2 py-1.5">{l.unidade || "UN"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {leitura.linhas.length > 10 && <p className="text-xs text-slate-500">Mostrando as 10 primeiras de {leitura.linhas.length} linhas.</p>}

              {erros.length > 0 && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{erros.length} linha(s) serão rejeitadas</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => baixarRelatorioErros(erros, leitura.linhas)}>
                      <Download className="w-4 h-4 mr-2" /> Baixar relatório de erros
                    </Button>
                  </div>
                  <ul className="text-xs text-rose-700 dark:text-rose-300 max-h-32 overflow-y-auto space-y-0.5">
                    {erros.slice(0, 50).map((e, i) => <li key={i}>Linha {e.linha}: {e.motivo}</li>)}
                    {erros.length > 50 && <li>… e mais {erros.length - 50}. Baixe o relatório para ver todas.</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {etapa === "importando" && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">Importando… não feche esta janela.</p>
              <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-[#075BFF] transition-all" style={{ width: `${progresso}%` }} />
              </div>
              <p className="text-xs text-slate-500 text-right">{progresso}%</p>
            </div>
          )}

          {etapa === "concluido" && resultado && (
            <div className={`rounded-xl p-4 space-y-2 ${resultado.ok ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-rose-50 dark:bg-rose-500/10"}`}>
              <p className={`font-bold flex items-center gap-2 ${resultado.ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                {resultado.ok ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {resultado.ok ? "Importação concluída" : "A importação parou no meio"}
              </p>
              {!resultado.ok && <p className="text-sm text-rose-700 dark:text-rose-300">{resultado.falha} O que foi gravado antes da falha está listado abaixo; use "Desfazer" para voltar ao estado anterior.</p>}
              <ul className="text-sm text-slate-700 dark:text-slate-300">
                <li><b>{resultado.criados}</b> produtos criados</li>
                <li><b>{resultado.atualizados}</b> produtos atualizados</li>
                <li><b>{resultado.ignorados}</b> produtos ignorados (já existiam)</li>
                <li><b>{analise?.resumo?.com_erro || 0}</b> linhas rejeitadas{analise?.resumo?.com_erro ? " — baixe o relatório para ver os motivos" : ""}</li>
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                {erros.length > 0 && (
                  <Button type="button" size="sm" variant="outline" onClick={() => baixarRelatorioErros(erros, leitura?.linhas)}>
                    <Download className="w-4 h-4 mr-2" /> Relatório de erros
                  </Button>
                )}
                {(resultado.criados + resultado.atualizados) > 0 && (
                  <Button type="button" size="sm" variant="outline" onClick={desfazer}><Undo2 className="w-4 h-4 mr-2" /> Desfazer importação</Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={limpar}>Importar outro arquivo</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {etapa !== "concluido" ? (
            <>
              <Button type="button" variant="outline" disabled={etapa === "importando"} onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button type="button" onClick={confirmar} disabled={!podeConfirmar} className="bg-[#075BFF] hover:bg-blue-600">
                {etapa === "importando" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar importação
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => onOpenChange(false)} className="bg-[#075BFF]">Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
