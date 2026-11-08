// src/lib/planilhaProdutos.js
// Leitura robusta de planilhas de produtos (XLSX, XLS, CSV ; ou ,) + modelo para download.
import * as XLSX from "xlsx";

export const CAMPOS = ["nome", "codigo", "ean", "marca", "categoria", "preco", "unidade"];
export const TITULOS = { nome: "Nome", codigo: "Código", ean: "EAN", marca: "Marca", categoria: "Categoria", preco: "Preço", unidade: "Unidade" };

// Sinônimos aceitos no cabeçalho (comparação sem acento, minúsculas, espaços normalizados)
const SINONIMOS = {
  ean: ["ean", "ean13", "ean 13", "gtin", "codigo de barras", "cod barras", "cod. barras", "codigo barras", "cod de barras", "codbarras"],
  codigo: ["codigo", "cod", "cod.", "codigo do produto", "cod produto", "cod. produto", "referencia", "ref", "ref.", "sku", "codigo interno", "cod interno"],
  nome: ["nome", "descricao", "produto", "nome do produto", "descricao do produto", "item", "descricao produto"],
  marca: ["marca", "fabricante"],
  categoria: ["categoria", "grupo", "familia", "linha", "secao", "departamento"],
  preco: ["preco", "valor", "preco unitario", "valor unitario", "preco tabela", "preco de tabela", "vlr", "vlr unit", "vl unit", "preco venda", "preco de venda", "valor (r$)", "preco (r$)", "preco r$", "valor r$"],
  unidade: ["unidade", "un", "und", "unid", "um", "u.m.", "unidade de medida"],
};

export function normalizar(txt) {
  return String(txt ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

function campoDoCabecalho(celula) {
  const n = normalizar(celula);
  if (!n) return null;
  for (const campo of ["ean", "codigo", "nome", "marca", "categoria", "preco", "unidade"]) {
    if (SINONIMOS[campo].includes(n)) return campo;
  }
  // variações comuns: "Preço (R$)", "Código EAN", "Descrição do item"
  if (/^(ean|gtin)\b|codigo de barras/.test(n)) return "ean";
  if (/^preco|^valor/.test(n)) return "preco";
  if (/^cod(igo)?\b/.test(n)) return "codigo";
  if (/^descri|^nome/.test(n)) return "nome";
  return null;
}

function mapearCabecalho(linha) {
  const mapa = {};
  (linha || []).forEach((cel, i) => {
    const campo = campoDoCabecalho(cel);
    if (campo && mapa[campo] === undefined) mapa[campo] = i;
  });
  return mapa;
}

function acharCabecalho(linhas) {
  const limite = Math.min(linhas.length, 40);
  for (let i = 0; i < limite; i++) {
    const mapa = mapearCabecalho(linhas[i]);
    const n = Object.keys(mapa).length;
    if (mapa.nome !== undefined && n >= 2) return { indice: i, mapa };
  }
  for (let i = 0; i < limite; i++) {      // planilha com uma única coluna "Nome"
    const mapa = mapearCabecalho(linhas[i]);
    if (mapa.nome !== undefined) return { indice: i, mapa };
  }
  return null;
}

// ------------------------------------------------------------------ CSV
export function decodificarTexto(buffer) {
  const bytes = new Uint8Array(buffer);
  let texto;
  try {
    texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    texto = new TextDecoder("windows-1252").decode(bytes);   // ISO-8859-1 / Windows-1252
  }
  return texto.replace(/^﻿/, "");
}

function detectarSeparador(texto) {
  const amostra = texto.split(/\r?\n/).filter(l => l.trim()).slice(0, 15);
  const conta = (sep) => amostra.reduce((s, l) => {
    let n = 0, aspas = false;
    for (const ch of l) { if (ch === '"') aspas = !aspas; else if (ch === sep && !aspas) n++; }
    return s + n;
  }, 0);
  const cands = [";", ",", "\t"].map(s => [s, conta(s)]).sort((a, b) => b[1] - a[1]);
  return cands[0][1] > 0 ? cands[0][0] : ";";
}

export function lerCSV(texto) {
  const sep = detectarSeparador(texto);
  const linhas = []; let linha = []; let campo = ""; let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = "";
    } else campo += ch;
  }
  if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
  return { linhas, separador: sep };
}

// ------------------------------------------------------------------ valores
export function textoCodigo(v, formatado) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") {
    if (formatado && /^\d+$/.test(String(formatado).trim())) return String(formatado).trim(); // ex.: formato "00000"
    if (Number.isInteger(v)) return v.toLocaleString("fullwide", { useGrouping: false });
    return String(v);
  }
  let s = String(v).trim();
  if (/^\d+\.0+$/.test(s)) s = s.split(".")[0];
  if (/^\d+(?:[.,]\d+)?e\+?\d+$/i.test(s)) {
    const n = Number(s.replace(",", "."));
    if (Number.isFinite(n)) s = n.toLocaleString("fullwide", { useGrouping: false });
  }
  return s;
}

/** Mesmas regras do servidor. null = inválido. */
export function lerPreco(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Math.round(v * 100) / 100;
  let s = String(v).replace(/r\$/gi, "").replace(/\s/g, "");
  if (!s) return 0;
  if (!/^-?[\d.,]+$/.test(s)) return null;
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    if ((s.match(/,/g) || []).length > 1) return null;
    s = s.replace(",", ".");
  } else if ((s.match(/\./g) || []).length > 1 || /^\d{1,3}\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

// ------------------------------------------------------------------ leitura principal
function escolherAba(wb) {
  const nomes = wb.SheetNames;
  const ordem = [...nomes.filter(n => normalizar(n) === "produtos"), ...nomes.filter(n => normalizar(n) !== "produtos")];
  for (const nome of ordem) {
    const ws = wb.Sheets[nome];
    if (!ws || !ws["!ref"]) continue;
    const brutas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "", blankrows: true });
    const cab = acharCabecalho(brutas);
    if (cab) {
      const formatadas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", blankrows: true });
      const inicio = XLSX.utils.decode_range(ws["!ref"]).s.r;   // linha real da 1ª linha lida
      return { aba: nome, brutas, formatadas, cab, inicio };
    }
  }
  return null;
}

/**
 * Lê o arquivo e devolve as linhas prontas para enviar ao servidor.
 * Lança Error com mensagem clara quando não encontra o cabeçalho.
 */
export function lerPlanilha(nomeArquivo, buffer) {
  const ext = (nomeArquivo.split(".").pop() || "").toLowerCase();
  let aba = null, brutas, formatadas, cab, inicio = 0, separador = null;

  if (ext === "csv" || ext === "txt") {
    const r = lerCSV(decodificarTexto(buffer));
    brutas = formatadas = r.linhas; separador = r.separador;
    cab = acharCabecalho(brutas);
  } else if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) {
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: false });
    const escolha = escolherAba(wb);
    if (escolha) ({ aba, brutas, formatadas, cab, inicio } = escolha);
    else brutas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
  } else {
    throw new Error("Formato não suportado. Envie .xlsx, .xls ou .csv.");
  }

  if (!cab) {
    const primeira = (brutas || []).find(l => (l || []).some(c => String(c).trim()));
    const vistos = primeira ? primeira.filter(c => String(c).trim()).slice(0, 8).join(", ") : "nenhum";
    throw new Error(`Colunas não encontradas: Nome. A planilha precisa de uma coluna "Nome" (ou "Descrição"/"Produto"). Cabeçalho encontrado: ${vistos}. Baixe o modelo.`);
  }

  const { indice, mapa } = cab;
  const faltando = CAMPOS.filter(c => mapa[c] === undefined).map(c => TITULOS[c]);
  const linhas = [];
  for (let i = indice + 1; i < brutas.length; i++) {
    const bruta = brutas[i] || [], fmt = (formatadas && formatadas[i]) || [];
    if (!bruta.some(c => String(c ?? "").trim())) continue;     // linha em branco
    const pega = (campo) => (mapa[campo] === undefined ? "" : bruta[mapa[campo]]);
    const pegaFmt = (campo) => (mapa[campo] === undefined ? "" : fmt[mapa[campo]]);
    const precoBruto = pega("preco");
    linhas.push({
      linha: inicio + i + 1,
      nome: String(pega("nome") ?? "").trim(),
      codigo: textoCodigo(pega("codigo"), pegaFmt("codigo")),
      ean: textoCodigo(pega("ean"), pegaFmt("ean")),
      marca: String(pega("marca") ?? "").trim(),
      categoria: String(pega("categoria") ?? "").trim(),
      preco: typeof precoBruto === "number" ? precoBruto : String(precoBruto ?? "").trim(),
      unidade: String(pega("unidade") ?? "").trim(),
    });
  }
  return { aba, separador, linhaCabecalho: inicio + indice + 1, colunasFaltando: faltando, linhas };
}

/** Remove repetidos (mesmo código, ou EAN quando não há código), mantendo a última ocorrência. */
export function semRepetidos(linhas) {
  const chave = l => (l.codigo ? `c:${l.codigo.toLowerCase()}` : (l.ean && normalizar(l.ean) !== "sem gtin" ? `e:${l.ean}` : null));
  const ultima = new Map();
  linhas.forEach((l, i) => { const k = chave(l); if (k) ultima.set(k, i); });
  return linhas.filter((l, i) => { const k = chave(l); return !k || ultima.get(k) === i; });
}

// ------------------------------------------------------------------ modelo e relatório
export function criarModeloWorkbook() {
  const cab = ["Nome", "Código", "EAN", "Marca", "Categoria", "Preço", "Unidade"];
  const exemplos = [
    ["Produto Exemplo 1", "COD001", "7891234567890", "Marca X", "Categoria Y", "49,90", "UN"],
    ["Produto Exemplo 2", "COD002", "7891234567891", "Marca Z", "Categoria W", "29,90", "UN"],
    ["Produto Exemplo 3", "COD003", "7891234567892", "Marca X", "Categoria Y", "19,90", "CX"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([cab, ...exemplos]);
  // Código (B) e EAN (C) como TEXTO até a linha 1000: sem notação científica e sem perder zeros
  for (let r = 1; r <= 1000; r++) {
    for (const c of [1, 2]) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };
      ws[ref].t = "s"; ws[ref].v = String(ws[ref].v ?? ""); ws[ref].z = "@";
    }
  }
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 1000, c: 6 } });
  ws["!cols"] = [{ wch: 36 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 9 }];

  const instrucoes = [
    ["Coluna", "Obrigatório?", "Formato aceito", "Exemplos"],
    ["Nome", "Sim", "Texto. Aceita também os títulos 'Descrição' ou 'Produto'.", "Caneta Azul 1.0mm"],
    ["Código", "Recomendado", "Texto. É usado para não duplicar produtos da mesma representada. Mantenha a coluna como Texto para não perder zeros à esquerda.", "COD001 · 00123"],
    ["EAN", "Opcional", "Texto com 8, 12, 13 ou 14 dígitos (código de barras/GTIN). Usado para identificar o produto quando não há Código.", "7891234567890"],
    ["Marca", "Opcional", "Texto.", "Marca X"],
    ["Categoria", "Opcional", "Texto.", "Papelaria"],
    ["Preço", "Opcional", "Número no formato brasileiro ou internacional. Vazio = 0.", "49,90 · 1.234,56 · R$ 1.234,56 · 1234.56"],
    ["Unidade", "Opcional", "Sigla da unidade de venda. Vazio = UN.", "UN · CX · KG · PCT"],
    [],
    ["Dicas"],
    ["• O cabeçalho pode estar em qualquer linha; títulos e linhas em branco acima dele são ignorados."],
    ["• Se o arquivo tiver várias abas, a aba 'Produtos' é usada primeiro."],
    ["• Ao reimportar, escolha 'Atualizar existentes' (atualiza preço, nome etc.) ou 'Ignorar existentes'."],
    ["• Também é possível importar CSV separado por ponto e vírgula (;) ou vírgula (,)."],
  ];
  const wsI = XLSX.utils.aoa_to_sheet(instrucoes);
  wsI["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 80 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  XLSX.utils.book_append_sheet(wb, wsI, "Instruções");
  return wb;
}

function baixar(nome, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function baixarModeloXLSX() {
  const buf = XLSX.write(criarModeloWorkbook(), { bookType: "xlsx", type: "array" });
  baixar("modelo_produtos_omnirepmax.xlsx", new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

const csvCampo = (v) => {
  const s = String(v ?? "");
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function baixarModeloCSV() {
  const linhas = [
    ["Nome", "Código", "EAN", "Marca", "Categoria", "Preço", "Unidade"],
    ["Produto Exemplo 1", "COD001", "7891234567890", "Marca X", "Categoria Y", "49,90", "UN"],
    ["Produto Exemplo 2", "COD002", "7891234567891", "Marca Z", "Categoria W", "29,90", "UN"],
  ];
  baixar("modelo_produtos_omnirepmax.csv", new Blob(["﻿" + linhas.map(l => l.map(csvCampo).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
}

/** Relatório das linhas rejeitadas, com a coluna "Motivo". */
export function baixarRelatorioErros(erros, linhasOriginais) {
  const porLinha = new Map((linhasOriginais || []).map(l => [l.linha, l]));
  const cab = ["Linha", "Nome", "Código", "EAN", "Marca", "Categoria", "Preço", "Unidade", "Motivo"];
  const corpo = erros.map(e => {
    const l = porLinha.get(e.linha) || {};
    return [e.linha, l.nome, l.codigo, l.ean, l.marca, l.categoria, l.preco, l.unidade, e.motivo];
  });
  baixar("erros_importacao.csv", new Blob(["﻿" + [cab, ...corpo].map(l => l.map(csvCampo).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
}
