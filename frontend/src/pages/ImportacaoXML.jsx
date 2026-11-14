import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  FileUp, CheckCircle2, AlertTriangle, FileText, Loader2, Sparkles, Download, X,
  ChevronDown, ChevronRight, FileSpreadsheet, RefreshCw, Copy, Ban,
} from "lucide-react";
import { fmtBRL, fmtDate } from "../lib/format";
import { decodificarTexto, lerCSV } from "../lib/planilhaProdutos";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ImportarProdutos from "../components/ImportarProdutos";

/**
 * Importação de notas — XML NF-e (vários arquivos de uma vez) e planilhas CSV/Excel.
 * 1) O servidor analisa e devolve a prévia (nada é gravado).
 * 2) Você confere, escolhe/cadastra representada e cliente, e confirma.
 * A IA (Groq) mapeia colunas de planilhas fora do padrão e lê XMLs que não são NF-e modelo 55.
 */

const NOVA = "__nova";
const temDados = (p) => !!(p && (String(p.cnpj || "").replace(/\D/g, "") || String(p.nome || p.fantasia || "").trim()));
const TRUNC = (s, n = 38) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "—");
const fmtCnpj = (v) => {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return v || "";
};
const selCls = "h-8 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/40";

const STATUS = {
  pronta:    { rotulo: "Pronta",      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  pendente:  { rotulo: "Cadastrar",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  duplicada: { rotulo: "Já importada", cls: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
};

const MODELO_CABECALHO = ["Número NF", "Série", "Data emissão", "CNPJ representada", "Representada", "CNPJ cliente", "Cliente",
  "Cidade", "UF", "Código produto", "EAN", "Descrição produto", "Quantidade", "Preço unitário", "Valor total NF", "Vencimentos"];
const MODELO_LINHAS = [
  ["1234", "1", "05/11/2026", "12.345.678/0001-99", "Fábrica Exemplo", "98.765.432/0001-55", "Loja Exemplo Ltda", "Joinville", "SC",
    "REF-100", "7891234567895", "Tênis modelo 100 - 38", "12", "89,90", "1.351,80", "05/12/2026; 04/01/2027"],
  ["1234", "1", "05/11/2026", "12.345.678/0001-99", "Fábrica Exemplo", "98.765.432/0001-55", "Loja Exemplo Ltda", "Joinville", "SC",
    "REF-200", "", "Sandália modelo 200", "6", "45,50", "1.351,80", ""],
];

// Planilha de CATÁLOGO (Nome, Código, EAN, Preço…) e não de notas? → vai para a importação de produtos.
const normCab = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function pareceCatalogo(linhas) {
  for (const l of (linhas || []).slice(0, 10)) {
    const cab = (l || []).map(normCab).filter(Boolean);
    if (cab.length < 2) continue;
    const tem = (...ws) => cab.some(c => ws.some(w => c === w || c.startsWith(w + " ")));
    const ehProduto = tem("preco", "valor unitario", "preco unitario") && tem("nome", "descricao", "produto", "ean", "codigo", "referencia");
    const ehNota = tem("nf", "nfe", "nota", "nota fiscal", "numero nf", "emissao", "data emissao", "cliente", "cnpj");
    if (ehProduto && !ehNota) {
      const iMarca = cab.findIndex(c => ["marca", "fabricante", "representada"].includes(c));
      return { indiceCab: (linhas || []).indexOf(l), iMarca };
    }
    if (ehProduto || ehNota) return null;
  }
  return null;
}

function baixarModelo() {
  const esc = (v) => (/[;"\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const csv = [MODELO_CABECALHO, ...MODELO_LINHAS].map(l => l.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "modelo_importacao_notas.csv" });
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function lerArquivo(f) {
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  const buf = await f.arrayBuffer();
  if (ext === "xml") return { tipo: "xml", nome: f.name, conteudo: decodificarTexto(buf) };
  if (ext === "csv" || ext === "txt") return { tipo: "planilha", nome: f.name, arquivo: f, linhas: lerCSV(decodificarTexto(buf)).linhas };
  if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) {
    const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
    // aba com mais linhas preenchidas
    let melhor = null;
    for (const nome of wb.SheetNames) {
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: false, defval: "", dateNF: "dd/mm/yyyy" });
      const cheias = linhas.filter(l => l.some(c => String(c).trim())).length;
      if (!melhor || cheias > melhor.cheias) melhor = { linhas, cheias };
    }
    return { tipo: "planilha", nome: f.name, arquivo: f, linhas: melhor ? melhor.linhas : [] };
  }
  if (ext === "pdf") throw new Error(`${f.name}: PDF (DANFE) não tem os dados estruturados — envie o arquivo XML da nota.`);
  if (ext === "zip") throw new Error(`${f.name}: descompacte o ZIP e envie os XMLs (pode selecionar vários de uma vez).`);
  throw new Error(`${f.name}: formato não suportado. Envie .xml, .csv, .xlsx ou .xls.`);
}

export default function ImportacaoXML() {
  const [xmls, setXmls] = useState([]);              // [{nome, conteudo}]
  const [planilha, setPlanilha] = useState(null);    // {nome, linhas}
  const [colar, setColar] = useState("");
  const [mostrarColar, setMostrarColar] = useState(false);
  const [analise, setAnalise] = useState(null);
  const [escolhas, setEscolhas] = useState({});      // id_temp -> {incluir, rep, cli, comissao}
  const [mapa, setMapa] = useState(null);            // mapeamento editado
  const [linhaCab, setLinhaCab] = useState(null);    // linha do cabeçalho escolhida
  const timerMapa = useRef(null);
  const [busy, setBusy] = useState(null);            // "analisar" | "ia" | "importar"
  const [resultado, setResultado] = useState(null);
  const [aberta, setAberta] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [arrastando, setArrastando] = useState(false);
  const [produtosAberto, setProdutosAberto] = useState(false);
  const [repsCat, setRepsCat] = useState([]);
  const inputRef = useRef(null);

  const carregarHistorico = useCallback(() => {
    api.get("/xml/historico").then(r => setHistorico(r.data || [])).catch(() => {});
  }, []);
  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  // ---------- leitura dos arquivos ----------
  const adicionarArquivos = async (files) => {
    const novosXml = []; let novaPlanilha = null;
    for (const f of Array.from(files || [])) {
      try {
        const a = await lerArquivo(f);
        if (a.tipo === "xml") novosXml.push({ nome: a.nome, conteudo: a.conteudo });
        else novaPlanilha = { nome: a.nome, linhas: a.linhas, arquivo: a.arquivo };
      } catch (e) { toast.error(e.message); }
    }
    if (!novosXml.length && !novaPlanilha) return;
    const xs = [...xmls.filter(x => !novosXml.some(n => n.nome === x.nome)), ...novosXml];
    const pl = novaPlanilha || planilha;
    setXmls(xs); if (novaPlanilha) { setPlanilha(novaPlanilha); setMapa(null); setLinhaCab(null); }
    analisar({ xs, pl, mapeamento: novaPlanilha ? null : mapa, cab: novaPlanilha ? null : linhaCab });
  };

  const adicionarColado = () => {
    const t = colar.trim();
    if (!t.startsWith("<")) return toast.error("Cole o conteúdo do XML (começa com <).");
    const xs = [...xmls, { nome: `colado-${xmls.length + 1}.xml`, conteudo: t }];
    setXmls(xs); setColar(""); setMostrarColar(false);
    analisar({ xs, pl: planilha, mapeamento: mapa });
  };

  const limpar = () => {
    setXmls([]); setPlanilha(null); setAnalise(null); setEscolhas({}); setMapa(null); setResultado(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ---------- análise (prévia) ----------
  const analisar = async ({ xs = xmls, pl = planilha, mapeamento = null, usarIa = false, cab = linhaCab } = {}) => {
    if (!xs.length && !pl) { setAnalise(null); return; }
    setBusy(usarIa ? "ia" : "analisar"); setResultado(null);
    try {
      const body = { xmls: xs };
      if (pl) body.planilha = { nome: pl.nome, linhas: pl.linhas, mapeamento: mapeamento || null, usar_ia: usarIa,
                                linha_cabecalho: cab ?? null };
      const { data } = await api.post("/importar-notas/analisar", body);
      setAnalise(data);
      if (data.planilha) { setMapa(data.planilha.mapeamento); setLinhaCab(data.planilha.linha_cabecalho); }
      const esc = {};
      const unicaRep = data.representadas.length === 1 ? data.representadas[0].id : "";
      for (const n of data.notas) {
        esc[n.id_temp] = {
          incluir: n.status !== "duplicada",
          // sem dados do emitente (planilha sem coluna de representada): usa a única cadastrada ou pede para escolher
          rep: n.representada_id || (temDados(n.emitente) ? NOVA : unicaRep),
          cli: n.cliente_id || (temDados(n.destinatario) ? NOVA : ""),
          comissao: 5,
        };
      }
      setEscolhas(esc);
      if (data.planilha?.origem_mapeamento === "ia") toast.success("A IA identificou as colunas da planilha. Confira antes de importar.");
      if (data.planilha?.erro_ia) toast.error(`A IA não conseguiu mapear: ${data.planilha.erro_ia}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não foi possível analisar os arquivos.");
    } finally { setBusy(null); }
  };

  // ---------- catálogo de produtos detectado ----------
  const catalogo = useMemo(() => (planilha ? pareceCatalogo(planilha.linhas) : null), [planilha]);
  useEffect(() => { if (catalogo) api.get("/representadas").then(r => setRepsCat(r.data || [])).catch(() => {}); }, [catalogo]);
  const repSugerida = useMemo(() => {
    if (!catalogo || catalogo.iMarca < 0 || !repsCat.length) return repsCat.length === 1 ? repsCat[0].id : "";
    const marcas = new Set(planilha.linhas.slice(catalogo.indiceCab + 1).map(l => normCab((l || [])[catalogo.iMarca])).filter(Boolean));
    const r = repsCat.find(x => marcas.has(normCab(x.nome_fantasia)) || marcas.has(normCab(x.razao_social)));
    return r ? r.id : (repsCat.length === 1 ? repsCat[0].id : "");
  }, [catalogo, repsCat, planilha]);

  // ---------- colunas: validação ao vivo + aplica sozinho ao trocar ----------
  const faltandoAoVivo = (m) => {
    if (!m) return [];
    const tem = (k) => m[k] !== null && m[k] !== undefined && m[k] !== "";
    const f = [];
    if (!tem("nf_numero")) f.push("Número da NF");
    if (!tem("data_emissao")) f.push("Data de emissão");
    if (!tem("cliente_cnpj") && !tem("cliente_nome")) f.push("Cliente (CNPJ ou nome)");
    if (!tem("valor_total") && !tem("valor_item") && !(tem("quantidade") && tem("preco_unitario")))
      f.push("Valor (total da nota, do item ou quantidade × preço)");
    return f;
  };
  const trocarColuna = (campo, valor) => {
    const novo = { ...(mapa || {}), [campo]: valor === "" ? null : Number(valor) };
    // a mesma coluna não pode ir para dois campos
    if (novo[campo] !== null) for (const k of Object.keys(novo)) if (k !== campo && novo[k] === novo[campo]) novo[k] = null;
    setMapa(novo);
    clearTimeout(timerMapa.current);
    if (!faltandoAoVivo(novo).length) timerMapa.current = setTimeout(() => analisar({ mapeamento: novo }), 450);
  };
  const trocarCabecalho = (idx) => { setLinhaCab(idx); setMapa(null); analisar({ mapeamento: null, cab: idx }); };

  // ---------- confirmar ----------
  const notas = analise?.notas || [];
  const selecionadas = notas.filter(n => escolhas[n.id_temp]?.incluir);
  const totalSel = selecionadas.reduce((s, n) => s + (Number(n.valor_total) || 0), 0);
  const novasReps = useMemo(() => {
    const m = new Map();
    for (const n of selecionadas) if (escolhas[n.id_temp]?.rep === NOVA) m.set(n.emitente?.cnpj || n.emitente?.nome, n.emitente);
    return m.size;
  }, [selecionadas, escolhas]);

  const importar = async () => {
    if (!selecionadas.length) return toast.error("Selecione ao menos uma nota.");
    const semRep = selecionadas.filter(n => !escolhas[n.id_temp]?.rep).map(n => n.numero);
    const semCli = selecionadas.filter(n => !escolhas[n.id_temp]?.cli).map(n => n.numero);
    if (semRep.length) return toast.error(`Escolha a representada da(s) NF ${semRep.slice(0, 5).join(", ")}${semRep.length > 5 ? "…" : ""} (ou use “Representada p/ todas”).`);
    if (semCli.length) return toast.error(`Escolha o cliente da(s) NF ${semCli.slice(0, 5).join(", ")}${semCli.length > 5 ? "…" : ""}.`);
    setBusy("importar");
    try {
      const { data } = await api.post("/importar-notas/confirmar", {
        notas: selecionadas.map(n => {
          const e = escolhas[n.id_temp];
          const { xml: _x, ...nota } = n;
          return {
            nota,
            representada_id: e.rep !== NOVA ? e.rep : null, criar_representada: e.rep === NOVA,
            comissao_nova_representada: e.rep === NOVA ? Number(e.comissao) || 0 : null,
            cliente_id: e.cli !== NOVA ? e.cli : null, criar_cliente: e.cli === NOVA,
          };
        }),
      });
      setResultado(data);
      if (data.importadas) toast.success(`${data.importadas} nota(s) importada(s) — pedidos, comissões e Contas a Receber criados.`);
      if (data.falhas) toast.warning(`${data.falhas} nota(s) não foram importadas. Veja os motivos.`);
      carregarHistorico();
      // tira da prévia o que foi importado
      const ok = new Set(data.resultados.filter(r => r.ok).map(r => r.id_temp));
      setAnalise(a => a && { ...a, notas: a.notas.filter(n => !ok.has(n.id_temp)) });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao importar.");
    } finally { setBusy(null); }
  };

  const setEsc = (id, patch) => setEscolhas(s => ({ ...s, [id]: { ...s[id], ...patch } }));
  const marcarTodas = (v) => setEscolhas(s => {
    const n = { ...s };
    for (const nota of notas) if (nota.status !== "duplicada") n[nota.id_temp] = { ...n[nota.id_temp], incluir: v };
    return n;
  });
  const aplicarRepATodas = (repId) => {
    if (!repId) return;
    setEscolhas(s => {
      const n = { ...s };
      for (const nota of notas) if (!nota.representada_id || n[nota.id_temp]?.rep === "") n[nota.id_temp] = { ...n[nota.id_temp], rep: repId };
      return n;
    });
  };

  const pl = analise?.planilha;
  const nomeRep = (id) => analise?.representadas.find(r => r.id === id)?.nome;
  const nomeCli = (id) => analise?.clientes.find(c => c.id === id)?.nome;

  return (
    <div className="pb-10">
      <PageHeader
        title="Importar notas"
        subtitle="XML da NF-e (vários de uma vez) ou planilha CSV/Excel — o sistema cria pedido, comissão e Contas a Receber"
      />

      {/* ===== 1. Envio ===== */}
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionarArquivos(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${arrastando ? "border-[#075BFF] bg-[#075BFF]/5" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"}`}
      >
        <FileUp className="w-10 h-10 mx-auto text-[#075BFF] mb-3" />
        <p className="font-semibold text-slate-900 dark:text-white">Arraste os arquivos aqui ou</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button onClick={() => inputRef.current?.click()} disabled={!!busy} className="bg-[#075BFF] hover:bg-blue-600">
            Escolher arquivos
          </Button>
          <Button variant="outline" onClick={() => setMostrarColar(v => !v)} disabled={!!busy}>Colar XML</Button>
          <Button variant="outline" onClick={baixarModelo}><Download className="w-4 h-4 mr-1" /> Modelo de planilha</Button>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden"
               accept=".xml,.csv,.txt,.xlsx,.xls,.xlsm,.ods,text/xml,application/xml"
               onChange={(e) => { adicionarArquivos(e.target.files); e.target.value = ""; }} />
        <p className="text-xs text-slate-500 mt-3">
          Aceita <b>XML de NF-e</b> (pode selecionar vários), <b>CSV</b> e <b>Excel</b>. Planilha em outro formato? A IA identifica as colunas.
        </p>
        {mostrarColar && (
          <div className="mt-4 text-left max-w-2xl mx-auto">
            <Textarea rows={5} value={colar} onChange={(e) => setColar(e.target.value)} placeholder="<nfeProc>…" className="font-mono text-xs" />
            <Button size="sm" className="mt-2" onClick={adicionarColado} disabled={!colar.trim()}>Adicionar</Button>
          </div>
        )}
      </div>

      {(xmls.length > 0 || planilha) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {xmls.map(x => (
            <span key={x.nome} className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
              <FileText className="w-3 h-3" /> {TRUNC(x.nome, 28)}
              <button className="ml-0.5 text-slate-400 hover:text-rose-500" onClick={() => {
                const xs = xmls.filter(y => y.nome !== x.nome); setXmls(xs); analisar({ xs, pl: planilha, mapeamento: mapa });
              }}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {planilha && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-1">
              <FileSpreadsheet className="w-3 h-3" /> {TRUNC(planilha.nome, 28)}
              <button className="ml-0.5 hover:text-rose-500" onClick={() => { setPlanilha(null); setMapa(null); analisar({ xs: xmls, pl: null }); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          <button className="text-slate-500 hover:text-rose-500 underline ml-1" onClick={limpar}>limpar tudo</button>
          {busy === "analisar" && <span className="inline-flex items-center gap-1 text-slate-500"><Loader2 className="w-3 h-3 animate-spin" /> analisando…</span>}
        </div>
      )}

      {catalogo && (
        <div className="mt-6 rounded-2xl border border-[#075BFF]/30 bg-[#075BFF]/5 p-5">
          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#075BFF]" /> Esta planilha é um catálogo de produtos
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Ela tem colunas de produto (nome, código, EAN, preço…), mas não tem número de nota, data nem cliente — então não dá para
            criar pedidos com ela. Importe como <b>produtos da representada</b> (eles aparecem na hora de lançar pedidos).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setProdutosAberto(true)} className="bg-[#075BFF] hover:bg-blue-600">Importar como produtos</Button>
            <Button variant="outline" onClick={() => { setPlanilha(null); setMapa(null); analisar({ xs: xmls, pl: null }); }}>Remover planilha</Button>
          </div>
        </div>
      )}

      <ImportarProdutos open={produtosAberto} onOpenChange={setProdutosAberto} representadas={repsCat}
                        representadaId={repSugerida} arquivoInicial={planilha?.arquivo} />

      {/* ===== 2. Colunas da planilha ===== */}
      {pl && !catalogo && (
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Colunas da planilha
                <span className={`text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 ${pl.origem_mapeamento === "ia" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {pl.origem_mapeamento === "ia" ? "mapeado pela IA" : pl.origem_mapeamento === "usuario" ? "ajustado por você" : "automático"}
                </span>
              </p>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
                {pl.total_linhas} linha(s) de dados · cabeçalho na
                <select className="h-6 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-1 max-w-[260px]"
                        value={linhaCab ?? pl.linha_cabecalho} onChange={(e) => trocarCabecalho(Number(e.target.value))}>
                  {(planilha?.linhas || []).slice(0, 15).map((l, i) => (
                    <option key={i} value={i}>linha {i + 1}: {TRUNC((l || []).filter(c => String(c).trim()).slice(0, 4).join(" | "), 50)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => analisar({ mapeamento: mapa, usarIa: true })}>
                {busy === "ia" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1 text-violet-500" />} Mapear com IA
              </Button>
              <Button size="sm" variant="outline" disabled={!!busy || faltandoAoVivo(mapa).length > 0} onClick={() => analisar({ mapeamento: mapa })}>
                {busy === "analisar" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />} Recalcular
              </Button>
            </div>
          </div>
          {pl.erro_ia && (
            <div className="mb-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300">
              <b>A IA não respondeu:</b> {pl.erro_ia} Escolha as colunas abaixo — a prévia atualiza sozinha.
            </div>
          )}
          {faltandoAoVivo(mapa).length > 0 ? (
            <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-200">
              <b>Falta escolher:</b> {faltandoAoVivo(mapa).join(", ")}. Escolha abaixo ou clique em “Mapear com IA”.
            </div>
          ) : (
            <div className="mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Colunas ok — {notas.filter(x => x.origem === "planilha").length} nota(s) montada(s) da planilha. Trocou alguma coluna? A prévia se atualiza sozinha.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2">
            {pl.campos.map(c => (
              <label key={c.id} className="text-xs">
                <span className="text-slate-500">{c.rotulo}</span>
                <select className={selCls} value={mapa?.[c.id] ?? ""} onChange={(e) => trocarColuna(c.id, e.target.value)}>
                  <option value="">— não usar —</option>
                  {pl.colunas.map((col, i) => <option key={i} value={i}>{col || `(coluna ${i + 1})`}</option>)}
                </select>
                {mapa?.[c.id] !== null && mapa?.[c.id] !== undefined && (
                  <span className="block truncate text-[10px] text-slate-400 mt-0.5">
                    ex.: {String(((planilha?.linhas || [])[(linhaCab ?? pl.linha_cabecalho) + 1] || [])[mapa[c.id]] ?? "") || "(vazio)"}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ===== arquivos recusados e avisos ===== */}
      {analise?.erros?.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm">
          <p className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2"><Ban className="w-4 h-4" /> {analise.erros.length} arquivo(s) não importável(is)</p>
          <ul className="mt-1 text-xs text-rose-700 dark:text-rose-300 list-disc pl-5 space-y-0.5">
            {analise.erros.map((e, i) => <li key={i}><b>{e.arquivo}</b>: {e.motivo}</li>)}
          </ul>
        </div>
      )}
      {analise?.avisos?.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200">
          <ul className="list-disc pl-5 space-y-0.5">{analise.avisos.slice(0, 12).map((a, i) => <li key={i}>{a}</li>)}</ul>
          {analise.avisos.length > 12 && <p className="mt-1">… e mais {analise.avisos.length - 12}.</p>}
        </div>
      )}

      {/* ===== 3. Prévia das notas ===== */}
      {notas.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Confira as notas ({notas.length})</p>
              <p className="text-xs text-slate-500">
                {notas.filter(n => n.status === "pronta").length} prontas · {notas.filter(n => n.status === "pendente").length} com cadastro novo · {notas.filter(n => n.status === "duplicada").length} já importadas
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {notas.some(n => !n.representada_id) && analise.representadas.length > 1 && (
                <select className={`${selCls} w-56`} defaultValue="" onChange={(e) => { aplicarRepATodas(e.target.value); e.target.value = ""; }}>
                  <option value="">Representada p/ todas sem vínculo…</option>
                  {analise.representadas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              )}
              <Button size="sm" variant="outline" onClick={() => marcarTodas(true)}>Marcar todas</Button>
              <Button size="sm" variant="outline" onClick={() => marcarTodas(false)}>Desmarcar</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
                <tr>
                  <th className="w-8 px-3 py-2"></th>
                  <th className="text-left px-3 py-2">NF</th>
                  <th className="text-left px-3 py-2 min-w-[200px]">Representada (emitente)</th>
                  <th className="text-left px-3 py-2 min-w-[200px]">Cliente (destinatário)</th>
                  <th className="text-right px-3 py-2">Valor</th>
                  <th className="text-center px-3 py-2">Parcelas</th>
                  <th className="text-center px-3 py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {notas.map(n => {
                  const e = escolhas[n.id_temp] || {};
                  const dup = n.status === "duplicada";
                  const aberto = aberta === n.id_temp;
                  return (
                    <React.Fragment key={n.id_temp}>
                      <tr className={`border-t border-slate-100 dark:border-slate-800 align-top ${dup ? "opacity-60" : ""}`}>
                        <td className="px-3 py-3">
                          <input type="checkbox" className="w-4 h-4 accent-[#075BFF]" disabled={dup}
                                 checked={!!e.incluir} onChange={(ev) => setEsc(n.id_temp, { incluir: ev.target.checked })} />
                        </td>
                        <td className="px-3 py-3">
                          <button className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white hover:text-[#075BFF]"
                                  onClick={() => setAberta(aberto ? null : n.id_temp)}>
                            {aberto ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            {n.numero}{n.serie ? `-${n.serie}` : ""}
                          </button>
                          <div className="text-[11px] text-slate-500">{n.data_emissao ? fmtDate(n.data_emissao) : "sem data"}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={n.arquivo}>{n.arquivo}</div>
                          {n.origem === "ia" && <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-600"><Sparkles className="w-3 h-3" /> lido pela IA</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200" title={n.emitente?.nome}>{TRUNC(n.emitente?.fantasia || n.emitente?.nome)}</div>
                          <div className="text-[10px] font-mono text-slate-400 mb-1">{fmtCnpj(n.emitente?.cnpj)}</div>
                          {!dup && (
                            <>
                              <select className={`${selCls} ${!e.rep ? "border-rose-400" : ""}`} value={e.rep ?? ""} onChange={(ev) => setEsc(n.id_temp, { rep: ev.target.value })}>
                                {!e.rep && <option value="">Escolha a representada…</option>}
                                {temDados(n.emitente) && <option value={NOVA}>+ Cadastrar como nova representada</option>}
                                {analise.representadas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                              </select>
                              {e.rep === NOVA ? (
                                <label className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                                  Comissão
                                  <input type="number" min="0" max="100" step="0.1" value={e.comissao}
                                         onChange={(ev) => setEsc(n.id_temp, { comissao: ev.target.value })}
                                         className="w-16 h-6 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 text-xs" />%
                                </label>
                              ) : n.representada_por === "nome" && e.rep === n.representada_id ? (
                                <div className="text-[10px] text-amber-600 mt-0.5">vinculada pelo nome — confira</div>
                              ) : null}
                            </>
                          )}
                          {dup && n.duplicada_pedido && <div className="text-[11px] text-slate-500">Pedido {n.duplicada_pedido}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200" title={n.destinatario?.nome}>{TRUNC(n.destinatario?.nome)}</div>
                          <div className="text-[10px] font-mono text-slate-400 mb-1">
                            {fmtCnpj(n.destinatario?.cnpj)}{n.destinatario?.cidade ? ` · ${n.destinatario.cidade}/${n.destinatario.uf || ""}` : ""}
                          </div>
                          {!dup && (
                            n.cliente_id && e.cli === n.cliente_id && !e.trocarCli ? (
                              <div className="text-[11px] text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {TRUNC(nomeCli(n.cliente_id), 26)}
                                <button className="text-slate-400 underline ml-1" onClick={() => setEsc(n.id_temp, { trocarCli: true })}>trocar</button>
                                {n.cliente_por === "nome" && <span className="text-amber-600 ml-1">(pelo nome)</span>}
                              </div>
                            ) : (
                              <select className={`${selCls} ${!e.cli ? "border-rose-400" : ""}`} value={e.cli ?? ""} onChange={(ev) => setEsc(n.id_temp, { cli: ev.target.value })}>
                                {!e.cli && <option value="">Escolha o cliente…</option>}
                                {temDados(n.destinatario) && <option value={NOVA}>+ Cadastrar este cliente</option>}
                                {analise.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}{c.cnpj ? ` · ${fmtCnpj(c.cnpj)}` : ""}</option>)}
                              </select>
                            )
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap">
                          {fmtBRL(n.valor_total)}
                          {n.valor_produtos && Math.abs(n.valor_produtos - n.valor_total) > 0.01 && (
                            <div className="text-[10px] text-slate-400 font-normal">produtos {fmtBRL(n.valor_produtos)}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-xs text-slate-600 dark:text-slate-300">{n.parcelas?.length || "1 (30 dias)"}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${STATUS[n.status]?.cls}`}>
                            {n.repetida_no_envio ? "Repetida" : STATUS[n.status]?.rotulo}
                          </span>
                        </td>
                      </tr>
                      {aberto && (
                        <tr className="bg-slate-50/70 dark:bg-slate-800/30">
                          <td></td>
                          <td colSpan={6} className="px-3 py-3">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                              <div className="lg:col-span-2">
                                <p className="font-semibold mb-1">Itens ({n.itens?.length || 0})</p>
                                <div className="max-h-48 overflow-y-auto space-y-0.5">
                                  {(n.itens || []).map((i, k) => (
                                    <div key={k} className="flex justify-between gap-3 border-b border-slate-100 dark:border-slate-800 py-0.5">
                                      <span className="truncate">{i.codigo ? <span className="font-mono text-slate-400 mr-1">{i.codigo}</span> : null}{i.nome}</span>
                                      <span className="font-mono whitespace-nowrap">{i.quantidade}× {fmtBRL(i.preco)} = {fmtBRL(i.total)}</span>
                                    </div>
                                  ))}
                                  {!n.itens?.length && <p className="text-slate-400">Sem itens (só o valor da nota).</p>}
                                </div>
                              </div>
                              <div>
                                <p className="font-semibold mb-1">Parcelas (duplicatas)</p>
                                {(n.parcelas || []).map((p, k) => (
                                  <div key={k} className="flex justify-between py-0.5"><span>{k + 1}ª · {fmtDate(p.vencimento)}</span><span className="font-mono">{fmtBRL(p.valor ?? p.valor_base)}</span></div>
                                ))}
                                {!n.parcelas?.length && <p className="text-slate-400">Sem duplicatas: a comissão vence em 30 dias.</p>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <b>{selecionadas.length}</b> nota(s) · {fmtBRL(totalSel)}
              {novasReps > 0 && <span className="text-amber-600"> · {novasReps} representada(s) nova(s)</span>}
            </p>
            <Button onClick={importar} disabled={!!busy || !selecionadas.length} className="bg-[#075BFF] hover:bg-blue-600">
              {busy === "importar" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Importar {selecionadas.length} nota(s)
            </Button>
          </div>
        </div>
      )}

      {analise && !notas.length && !resultado && !busy && !catalogo && (analise.erros.length > 0 || pl) && (
        <p className="mt-4 text-sm text-slate-500">Nenhuma nota para importar{pl?.faltando?.length ? " — ajuste as colunas da planilha acima." : "."}</p>
      )}

      {/* ===== 4. Resultado ===== */}
      {resultado && (
        <div className={`mt-6 rounded-2xl border p-5 ${resultado.falhas ? "border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30" : "border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30"}`}>
          <p className="font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            {resultado.falhas ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {resultado.importadas} importada(s){resultado.falhas ? ` · ${resultado.falhas} não importada(s)` : ""}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            {resultado.representadas_criadas ? `${resultado.representadas_criadas} representada(s) e ` : ""}
            {resultado.clientes_criados ? `${resultado.clientes_criados} cliente(s) cadastrado(s). ` : ""}
            Cada nota virou um pedido faturado, com comissão e parcelas em Contas a Receber.
          </p>
          <ul className="mt-2 text-xs space-y-0.5">
            {resultado.resultados.map((r, i) => (
              <li key={i} className={r.ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
                NF {r.numero}: {r.ok ? `pedido ${r.pedido} · ${fmtBRL(r.total)} · comissão ${fmtBRL(r.comissao)}` : r.erro}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-3 text-xs">
            <Link to="/pedidos" className="underline font-semibold">Ver pedidos →</Link>
            <Link to="/comissoes" className="underline font-semibold">Ver comissões →</Link>
          </div>
        </div>
      )}

      {/* ===== Histórico ===== */}
      <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Últimas importações ({historico.length})</p>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {historico.slice(0, 30).map(h => (
            <div key={h.id} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                {h.origem === "planilha" ? <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <span className="truncate">NF {h.numero || "?"} · {h.emitente?.fantasia || h.emitente?.nome || "—"} → {h.destinatario?.nome || "—"}</span>
                {!h.pedido_id && <span className="text-amber-600 shrink-0">(sem pedido)</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-400">{h.created_at ? fmtDate(h.created_at) : ""}</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">{fmtBRL(h.valor_total)}</span>
              </div>
            </div>
          ))}
          {!historico.length && <p className="text-xs text-slate-400">Nenhuma nota importada ainda.</p>}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
        <Copy className="w-3 h-3" /> Notas já importadas (mesmo número e representada) são detectadas e não geram pedido duplicado.
      </p>
    </div>
  );
}
