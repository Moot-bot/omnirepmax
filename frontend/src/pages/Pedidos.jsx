import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Plus, Trash2, Calculator, UserPlus, Loader2, Edit2,
  PlusCircle, MinusCircle, Download, FileCheck,
  Ban, AlertCircle, Check, Share2, MessageCircle, Mail, CalendarClock, Eye, Save, X
} from "lucide-react";
import { fmtBRL, fmtDate } from "../lib/format";
import { toast } from "sonner";
// ✅ FIX: imports únicos (antes jsPDF era importado 2x → SyntaxError e o PDF não funcionava)
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const hoje = () => new Date().toISOString().split("T")[0];
const novoForm = () => ({
  cliente_id: "", representada_id: "", condicao_pagamento: "30/60", itens: [], parcelas: [],
  numero_referencia: "", observacoes: "", data_pedido: hoje(), data_emissao: "",
});
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const hojeMais = (dias) => { const dt = new Date(); dt.setDate(dt.getDate() + dias); return dt.toISOString().split("T")[0]; };
const toDateInput = (v) => (v ? String(v).split("T")[0] : "");
const somaParcelas = (arr) => (arr || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
// Parcelas vindas do backend podem ter só valor_base (duplicatas da NF-e) e vencimento ISO
const normParcelas = (arr) => (arr || []).map(p => ({
  ...p,
  vencimento: toDateInput(p.vencimento),
  valor: Number(p.valor ?? p.valor_base) || 0,
}));
// valor_base faz o backend ratear a comissão proporcionalmente a cada parcela
const payloadParcelas = (arr) => (arr || []).map(p => ({
  ...p,
  valor: round2(p.valor),
  valor_base: round2(p.valor),
}));
const podeEditar = (status) => status !== "cancelado" && status !== "orcamento";
const isFaturado = (status) => status === "faturado" || status === "faturado_parcial";

export default function Pedidos() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const [tab, setTab] = useState("todos");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(novoForm());
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [selectedProd, setSelectedProd] = useState("");
  const [qtd, setQtd] = useState(1);

  const [fatOpen, setFatOpen] = useState(false);
  const [selectedPed, setSelectedPed] = useState(null);
  const [fatForm, setFatForm] = useState({ nf_numero: "", nf_serie: "", data_faturamento: "", valor_faturado: 0, parcelas: [] });

  const [cliOpen, setCliOpen] = useState(false);
  const [newCli, setNewCli] = useState({ razao_social: "", nome_fantasia: "", cnpj_cpf: "", cidade: "", estado: "" });
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [sharePedido, setSharePedido] = useState(null);

  // ✅ NOVO: edição de parcelas em pedidos faturados
  const [parcOpen, setParcOpen] = useState(false);
  const [parcPed, setParcPed] = useState(null);
  const [parcList, setParcList] = useState([]);
  const [savingParc, setSavingParc] = useState(false);

  // ✅ NOVO: visualização individual do pedido + edição de NF
  const [verPed, setVerPed] = useState(null);
  const [nfEdit, setNfEdit] = useState(null); // { id, nf_numero, nf_serie, data_faturamento }

  const load = useCallback(async () => {
    try {
      const [pRes, rRes, cRes] = await Promise.all([api.get("/pedidos"), api.get("/representadas"), api.get("/clientes")]);
      setList(pRes.data); setReps(rRes.data); setClientes(cRes.data);
    } catch { toast.error("Erro ao carregar dados."); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (form.representada_id) api.get(`/produtos?representada_id=${form.representada_id}`).then(r => setProdutos(r.data));
    else setProdutos([]);
  }, [form.representada_id]);

  const buscarCNPJ = async (cnpjRaw) => {
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) return;
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await res.json();
      setNewCli(prev => ({ ...prev, razao_social: data.razao_social || prev.razao_social, nome_fantasia: data.nome_fantasia || prev.nome_fantasia, cidade: data.municipio || prev.cidade, estado: data.uf || prev.estado }));
      toast.success("CNPJ localizado!");
    } catch { toast.error("Erro ao buscar CNPJ."); } finally { setLoadingCnpj(false); }
  };

  const saveNewCli = async () => {
    if (!newCli.razao_social) return toast.error("Razão Social é obrigatória");
    try {
      const res = await api.post("/clientes", { ...newCli, status: "ativo" });
      toast.success("Cliente cadastrado!");
      setClientes([...clientes, res.data]);
      setForm({ ...form, cliente_id: res.data.id });
      setCliOpen(false); setNewCli({ razao_social: "", nome_fantasia: "", cnpj_cpf: "", cidade: "", estado: "" });
    } catch { toast.error("Erro ao cadastrar cliente."); }
  };

  const addItem = () => {
    const p = produtos.find(x => x.id === selectedProd);
    if (!p) return toast.error("Selecione um produto");
    setForm({ ...form, itens: [...(form.itens || []), { produto_id: p.id, nome: p.nome, quantidade: qtd, preco_unitario: p.preco_tabela, desconto: 0 }] });
    setSelectedProd(""); setQtd(1);
  };

  const removeItem = (idx) => { const n = [...(form.itens || [])]; n.splice(idx, 1); setForm({ ...form, itens: n }); };
  const calcTotal = () => (form.itens || []).reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.preco_unitario)), 0);

  const gerarParcelas = () => {
    const total = calcTotal();
    if (total <= 0) return toast.error("Adicione itens primeiro");
    const dias = (form.condicao_pagamento || "30").split("/").map(d => parseInt(d.trim()) || 30);
    const valorParcela = round2(total / dias.length);
    const parcelas = dias.map(d => ({ vencimento: hojeMais(d), valor: valorParcela }));
    // ajusta centavos na última parcela
    parcelas[parcelas.length - 1].valor = round2(valorParcela + (total - valorParcela * dias.length));
    setForm({ ...form, parcelas });
  };

  const addParcelaManual = () => {
    // ✅ FIX: Number() — p.valor pode vir string do input
    const restante = calcTotal() - somaParcelas(form.parcelas);
    setForm({ ...form, parcelas: [...(form.parcelas || []), { vencimento: hojeMais(30), valor: round2(Math.max(0, restante)) }] });
  };

  const updateParcela = (idx, field, value) => {
    const novas = (form.parcelas || []).map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    setForm({ ...form, parcelas: novas });
  };
  const removeParcela = (idx) => { const novas = [...(form.parcelas || [])]; novas.splice(idx, 1); setForm({ ...form, parcelas: novas }); };

  const fecharForm = () => {
    setOpen(false); setForm(novoForm()); setEditingId(null); setEditingStatus(null);
  };

  const save = async (statusFinal = "rascunho") => {
    if (!form.cliente_id || !form.representada_id) return toast.error("Selecione Cliente e Representada");
    if ((form.itens || []).length === 0) return toast.error("Adicione itens");
    try {
      // ✅ FIX: sempre envia as parcelas do form (antes um pedido faturado editado podia ir com parcelas vazias)
      const payload = {
        ...form,
        parcelas: payloadParcelas(form.parcelas),
        status: statusFinal,
        data_pedido: form.data_pedido || null,
        data_emissao: form.data_emissao || null,
      };
      if (editingId) await api.put(`/pedidos/${editingId}`, payload);
      else await api.post("/pedidos", payload);
      toast.success(editingId ? "Pedido atualizado!" : (statusFinal === "orcamento" ? "Orçamento salvo!" : "Pedido criado!"));
      fecharForm(); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao salvar pedido"); }
  };

  const handleEdit = (p) => {
    setForm({
      cliente_id: p.cliente_id,
      representada_id: p.representada_id,
      condicao_pagamento: p.condicao_pagamento || "30",
      itens: p.itens || [],
      parcelas: normParcelas(p.parcelas),
      numero_referencia: p.numero_referencia || "",
      observacoes: p.observacoes || "",
      data_pedido: toDateInput(p.data_pedido) || hoje(),
      data_emissao: toDateInput(p.data_emissao),
    });
    setEditingId(p.id); setEditingStatus(p.status); setOpen(true);
  };

  const handleOpenFat = (p) => {
    setSelectedPed(p);
    setFatForm({ nf_numero: "", nf_serie: "", valor_faturado: p.saldo_a_faturar || p.total, data_faturamento: new Date().toISOString().split('T')[0], parcelas: [] });
    setFatOpen(true);
  };

  // Mantido: o backend recalcula o valor da comissão e usa estas parcelas (vencimentos + proporção)
  const gerarParcelasFaturamento = () => {
    const rep = reps.find(r => r.id === selectedPed.representada_id);
    const percentual = rep?.comissao_padrao || 5;
    const valorComissao = Number(fatForm.valor_faturado) * (percentual / 100);
    const dias = (rep?.prazo_pagamento || "30").split("/").map(d => parseInt(d.trim()) || 30);
    const valParcela = round2(valorComissao / dias.length);
    const parcelas = dias.map(d => ({ vencimento: hojeMais(d), valor: valParcela }));
    setFatForm({ ...fatForm, parcelas });
  };

  const updateParcelaFat = (idx, field, value) => {
    const n = (fatForm.parcelas || []).map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    setFatForm({ ...fatForm, parcelas: n });
  };

  const faturar = async () => {
    if (!fatForm.nf_numero.trim()) return toast.error("Informe a NF");
    if (Number(fatForm.valor_faturado) <= 0) return toast.error("Informe o valor faturado");
    try {
      await api.post(`/pedidos/${selectedPed.id}/faturamento`, {
        ...fatForm,
        valor_faturado: round2(fatForm.valor_faturado),
        parcelas: payloadParcelas(fatForm.parcelas),
      });
      toast.success("Faturamento registrado!");
      setFatOpen(false); load();
    } catch (e) {
      // ✅ NOVO: NF duplicada (409)
      if (e.response?.status === 409) {
        toast.error("NF já registrada", { description: e.response?.data?.detail, duration: 8000 });
      } else {
        toast.error(e.response?.data?.detail || "Erro ao registrar faturamento");
      }
    }
  };

  // ✅ NOVO: modal de edição de parcelas (pedidos faturados)
  const handleOpenParcelas = (p) => {
    setParcPed(p);
    setParcList(normParcelas(p.parcelas));
    setParcOpen(true);
  };

  const updateParcelaEdit = (idx, field, value) => {
    setParcList(parcList.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };
  const removeParcelaEdit = (idx) => { const n = [...parcList]; n.splice(idx, 1); setParcList(n); };
  const addParcelaEdit = () => {
    const restante = Number(parcPed?.total || 0) - somaParcelas(parcList);
    setParcList([...parcList, { vencimento: hojeMais(30), valor: round2(Math.max(0, restante)) }]);
  };

  const saveParcelas = async () => {
    if (parcList.length === 0) return toast.error("Informe ao menos uma parcela");
    if (parcList.some(p => !p.vencimento || Number(p.valor) <= 0)) return toast.error("Todas as parcelas precisam de vencimento e valor maior que zero");
    setSavingParc(true);
    try {
      const res = await api.patch(`/pedidos/${parcPed.id}/parcelas`, { parcelas: payloadParcelas(parcList) });
      const r = res.data?.parcelas_regeneradas;
      if (r?.bloqueadas_por_recebimento > 0) {
        toast.warning(`Parcelas salvas. ${r.bloqueadas_por_recebimento} comissão(ões) com recebimento não foram alteradas.`);
      } else {
        toast.success("Parcelas atualizadas e comissões recalculadas!");
      }
      setParcOpen(false); load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar parcelas");
    } finally { setSavingParc(false); }
  };

  const salvarNF = async () => {
    if (!nfEdit?.nf_numero?.trim()) return toast.error("Informe o número da NF");
    try {
      await api.patch(`/faturamentos/${nfEdit.id}`, {
        nf_numero: nfEdit.nf_numero, nf_serie: nfEdit.nf_serie || "", data_faturamento: nfEdit.data_faturamento || null,
      });
      toast.success("Nota fiscal atualizada!");
      setNfEdit(null);
      const r = await api.get("/pedidos");
      setList(r.data);
      setVerPed(r.data.find(x => x.id === verPed?.id) || null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao atualizar a NF");
    }
  };

  const getDiasEspera = (dataPedido) => {
    if (!dataPedido) return 0;
    const diff = new Date() - new Date(dataPedido);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const cancelarPedido = async (p) => {
    if (!window.confirm(`Tem certeza que deseja CANCELAR o pedido ${p.numero}? Isso estornará as comissões e contas a receber pendentes.`)) return;
    try {
      await api.post(`/pedidos/${p.id}/cancelar`);
      toast.success("Pedido cancelado com sucesso.");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao cancelar pedido.");
    }
  };

  const aprovarOrcamento = async (p) => {
    if (!window.confirm(`Aprovar o orçamento ${p.numero}? Ele será convertido em Pedido.`)) return;
    try {
      await api.patch(`/pedidos/${p.id}/status`, { status: "aprovado" });
      toast.success("Orçamento aprovado e convertido em Pedido!");
      load();
    } catch (e) {
      toast.error("Erro ao aprovar orçamento.");
    }
  };

  const handleOpenShare = (p) => {
    setSharePedido(p);
    setShareOpen(true);
  };

  const gerarTextoCompartilhamento = (p) => {
    const cliente = clientes.find(c => c.id === p.cliente_id);
    const rep = reps.find(r => r.id === p.representada_id);
    let texto = `*Resumo do Pedido ${p.numero}${p.numero_referencia ? ` (ref. ${p.numero_referencia})` : ""}*\n\n`;
    texto += `Olá, ${cliente?.nome_fantasia || 'cliente'}!\n`;
    texto += `Segue o resumo do seu pedido com a fábrica *${rep?.nome_fantasia}*:\n\n`;

    (p.itens || []).forEach(it => {
      texto += `▪ ${it.quantidade}x ${it.nome} - ${fmtBRL(it.quantidade * it.preco_unitario)}\n`;
    });

    texto += `\n*Total do Pedido: ${fmtBRL(p.total)}*\n`;
    texto += `Condição de Pagamento: ${p.condicao_pagamento || 'A combinar'}\n\n`;
    texto += `Qualquer dúvida, estou à disposição!`;
    return encodeURIComponent(texto);
  };

  const gerarPDF = (p) => {
    try {
      const cliente = clientes.find(c => c.id === p.cliente_id);
      const rep = reps.find(r => r.id === p.representada_id);

      const doc = new jsPDF();
      const titulo = p.status === "orcamento" ? "Orçamento" : "Pedido";

      doc.setFontSize(20);
      doc.text(`${titulo}: ${p.numero}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Data do pedido: ${fmtDate(p.data_pedido)}${p.data_emissao ? `   ·   Emissão: ${fmtDate(p.data_emissao)}` : ""}`, 14, 28);
      doc.text(`Status: ${(p.status || "").toUpperCase()}${p.numero_referencia ? `   ·   Nº ref.: ${p.numero_referencia}` : ""}${p.nf_numero ? `   ·   NF: ${p.nf_numero}` : ""}`, 14, 33);

      doc.setFontSize(12);
      doc.text("Cliente:", 14, 45);
      doc.setFontSize(10);
      doc.text(`${cliente?.razao_social || "N/A"}`, 14, 50);
      doc.text(`CNPJ: ${cliente?.cnpj_cpf || "N/A"}`, 14, 55);

      doc.setFontSize(12);
      doc.text("Representada:", 120, 45);
      doc.setFontSize(10);
      doc.text(`${rep?.nome_fantasia || "N/A"}`, 120, 50);

      const body = (p.itens || []).map(it => [
        it.nome,
        it.quantidade,
        fmtBRL(it.preco_unitario),
        fmtBRL(it.quantidade * it.preco_unitario)
      ]);

      // ✅ FIX: autoTable via default import (não depende do side-effect no prototype)
      autoTable(doc, {
        startY: 65,
        head: [['Produto', 'Qtd', 'Preço Unit.', 'Total']],
        body,
        theme: 'striped',
        headStyles: { fillColor: [7, 91, 255] }
      });

      let finalY = (doc.lastAutoTable?.finalY ?? 65) + 10;
      doc.setFontSize(12);
      doc.text(`Total: ${fmtBRL(p.total)}`, 14, finalY);

      if (p.valor_faturado_total > 0) {
        doc.text(`Faturado: ${fmtBRL(p.valor_faturado_total)}`, 14, finalY + 7);
        doc.setFont(undefined, 'bold');
        doc.text(`Saldo a Faturar: ${fmtBRL(p.saldo_a_faturar)}`, 14, finalY + 14);
        doc.setFont(undefined, 'normal');
        finalY += 14;
      }

      const parcelas = normParcelas(p.parcelas);
      if (parcelas.length > 0) {
        autoTable(doc, {
          startY: finalY + 8,
          head: [['Parcela', 'Vencimento', 'Valor']],
          body: parcelas.map((pc, i) => [`${i + 1}/${parcelas.length}`, fmtDate(pc.vencimento), fmtBRL(pc.valor)]),
          theme: 'grid',
          headStyles: { fillColor: [100, 116, 139] }
        });
      }

      if (p.observacoes) {
        const y = (doc.lastAutoTable?.finalY ?? finalY) + 12;
        doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text("Observações:", 14, y);
        doc.setFont(undefined, 'normal'); doc.setFontSize(10);
        doc.text(doc.splitTextToSize(p.observacoes, 180), 14, y + 6);
      }

      doc.save(`${titulo}_${p.numero}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.");
    }
  };

  const pedidosFiltrados = list.filter(p => {
    if (tab === "orcamentos") return p.status === "orcamento";
    if (tab === "aguardando") return p.status === "aprovado" || p.status === "enviado" || p.status === "faturado_parcial" || p.status === "rascunho";
    if (tab === "faturados") return p.status === "faturado";
    return true;
  });

  const parcDiferenca = round2(Number(parcPed?.total || 0) - somaParcelas(parcList));

  return (
    <div className="pb-10">
      <PageHeader title="Pedidos" subtitle="Lançamento, Orçamentos e Faturamento" actions={
        <Button onClick={() => { setForm(novoForm()); setEditingId(null); setEditingStatus(null); setOpen(true); }} className="bg-[#075BFF]">
          <Plus className="w-4 h-4 mr-2" /> Novo Pedido / Orçamento
        </Button>
      } />

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="aguardando">Aguardando Faturamento</TabsTrigger>
          <TabsTrigger value="faturados">Totalmente Faturados</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-4 text-left text-slate-700 dark:text-slate-300">Nº Pedido</th>
              <th className="px-4 py-4 text-left text-slate-700 dark:text-slate-300">Cliente / Representada</th>
              <th className="px-4 py-4 text-left text-slate-700 dark:text-slate-300">Data do pedido</th>
              <th className="px-4 py-4 text-left text-slate-700 dark:text-slate-300">Emissão</th>
              <th className="px-4 py-4 text-left text-slate-700 dark:text-slate-300">NF</th>
              <th className="px-4 py-4 text-right text-slate-700 dark:text-slate-300">Total</th>
              <th className="px-5 py-4 text-right text-amber-600">A Faturar</th>
              <th className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">Status</th>
              <th className="px-5 py-4 text-right text-slate-700 dark:text-slate-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map(p => (
              <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">{p.numero}</div>
                  {p.numero_referencia && <div className="text-xs text-slate-500">Ref.: {p.numero_referencia}</div>}
                </td>
                <td className="px-5 py-3">
                  <div className="font-semibold text-slate-900 dark:text-white">{clientes.find(c => c.id === p.cliente_id)?.nome_fantasia}</div>
                  <div className="text-xs text-slate-500">{reps.find(r => r.id === p.representada_id)?.nome_fantasia}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmtDate(p.data_pedido)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.data_emissao ? fmtDate(p.data_emissao) : "—"}</td>
                <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{p.nf_numero || "—"}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmtBRL(p.total)}</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-500">
                  {p.saldo_a_faturar > 0 ? fmtBRL(p.saldo_a_faturar) : "-"}
                </td>
                <td className="px-5 py-3 text-center">
                  <StatusBadge status={p.status} />
                  {p.status !== "faturado" && p.status !== "cancelado" && p.status !== "orcamento" && getDiasEspera(p.data_pedido) > 15 && (
                    <div className="text-[10px] text-rose-600 font-bold mt-1 flex items-center justify-center gap-1 bg-rose-50 dark:bg-rose-500/10 py-0.5 px-2 rounded-full w-fit mx-auto">
                      <AlertCircle className="w-3 h-3" /> {getDiasEspera(p.data_pedido)} dias parado
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setVerPed(p)} title="Ver detalhes" className="text-slate-500 hover:text-[#075BFF]">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenShare(p)} title="Compartilhar" className="text-slate-500 hover:text-emerald-600">
                      <Share2 className="w-4 h-4" />
                    </Button>

                    <Button variant="ghost" size="sm" onClick={() => gerarPDF(p)} title="Gerar PDF" className="text-slate-500 hover:text-[#075BFF]">
                      <Download className="w-4 h-4" />
                    </Button>

                    {p.status === "orcamento" && (
                      <Button size="sm" onClick={() => aprovarOrcamento(p)} className="bg-[#075BFF] hover:bg-blue-600 h-8">
                        <Check className="w-3.5 h-3.5 mr-1" /> Aprovar
                      </Button>
                    )}

                    {p.status !== "cancelado" && p.status !== "faturado" && p.status !== "orcamento" && (
                      <Button size="sm" variant="ghost" onClick={() => cancelarPedido(p)} title="Cancelar Pedido" className="text-slate-500 hover:text-rose-600">
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}

                    {/* ✅ Edição liberada em qualquer status, exceto cancelado/orçamento */}
                    {podeEditar(p.status) && (
                      <Button size="sm" variant="outline" onClick={() => handleEdit(p)} title="Editar">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {/* ✅ NOVO: editar parcelas em pedidos faturados */}
                    {isFaturado(p.status) && (
                      <Button size="sm" variant="outline" onClick={() => handleOpenParcelas(p)} title="Editar parcelas" className="h-8">
                        <CalendarClock className="w-3.5 h-3.5 mr-1" /> Parcelas
                      </Button>
                    )}

                    {p.status !== "faturado" && p.status !== "orcamento" && p.status !== "cancelado" && (
                      <Button size="sm" onClick={() => handleOpenFat(p)} className="bg-emerald-600 hover:bg-emerald-700 h-8">
                        <FileCheck className="w-3.5 h-3.5 mr-1" /> Faturar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pedidosFiltrados.length === 0 && (
              <tr><td colSpan={9} className="text-center py-10 text-slate-500">Nenhum pedido encontrado nesta aba.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : fecharForm())}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Pedido" : "Novo Pedido / Orçamento"}</DialogTitle></DialogHeader>

          {editingId && isFaturado(editingStatus) && (
            <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Pedido já faturado: ao salvar, as parcelas de comissão ainda não recebidas serão recalculadas. Comissões com recebimento não são alteradas.
            </div>
          )}

          {/* ✅ NOVO: dados do pedido */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nº do pedido (fábrica/cliente)</Label>
              <Input value={form.numero_referencia} onChange={e => setForm({ ...form, numero_referencia: e.target.value })}
                     placeholder="Ex.: OC-12345" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div className="space-y-1.5">
              <Label>Data do pedido</Label>
              <Input type="date" value={form.data_pedido} onChange={e => setForm({ ...form, data_pedido: e.target.value })}
                     className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de emissão</Label>
              <Input type="date" value={form.data_emissao} onChange={e => setForm({ ...form, data_emissao: e.target.value })}
                     className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Representada</Label>
                <Select value={form.representada_id} onValueChange={v => setForm({...form, representada_id: v, itens: []})} disabled={!!editingId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{reps.map(r => <SelectItem key={r.id} value={r.id}>{r.nome_fantasia}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <div className="flex gap-2">
                  <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>)}</SelectContent>
                  </Select>
                  {!editingId && <Button variant="outline" onClick={() => setCliOpen(true)} title="Novo Cliente"><UserPlus className="w-4 h-4" /></Button>}
                </div>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-3">
                <Label>Itens do Pedido</Label>
                <div className="flex gap-2">
                  <Select value={selectedProd} onValueChange={setSelectedProd} disabled={!form.representada_id}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Produto..." /></SelectTrigger>
                    <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} - {fmtBRL(p.preco_tabela)}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" className="w-20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={qtd} onChange={e => setQtd(parseInt(e.target.value) || 1)} min={1} />
                  <Button onClick={addItem} variant="outline">Add</Button>
                </div>
                <div className="space-y-1">
                  {(form.itens || []).map((it, i) => (
                    <div key={i} className="flex justify-between text-sm bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                      <span>{it.quantidade}x {it.nome}</span>
                      <div className="flex items-center gap-2 font-mono text-slate-900 dark:text-white">{fmtBRL(it.quantidade * it.preco_unitario)} <Trash2 className="w-3.5 h-3.5 text-rose-500 cursor-pointer" onClick={() => removeItem(i)}/></div>
                    </div>
                  ))}
                </div>
                {(form.itens || []).length > 0 && <div className="text-right font-bold pt-2 text-lg dark:text-white">Total: {fmtBRL(calcTotal())}</div>}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base">Parcelamento</Label>
                <Button onClick={gerarParcelas} variant="secondary" size="sm" disabled={(form.itens || []).length === 0}><Calculator className="w-4 h-4 mr-1" /> Auto-Calcular</Button>
              </div>
              <div className="space-y-1.5">
                <Label>Condição para Auto-Cálculo</Label>
                <Input className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={form.condicao_pagamento} onChange={e => setForm({...form, condicao_pagamento: e.target.value})} placeholder="Ex: 30/60/90" />
              </div>
              <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto pr-2">
                {(form.parcelas || []).map((p, i) => (
                  <div key={i} className="flex gap-2 items-center bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-400 w-6">{i+1}ª</span>
                    <Input type="date" value={toDateInput(p.vencimento)} onChange={e => updateParcela(i, "vencimento", e.target.value)} className="flex-1 h-8 text-xs bg-transparent border-none p-0 text-slate-900 dark:text-white" />
                    <Input type="number" step="0.01" value={p.valor} onChange={e => updateParcela(i, "valor", parseFloat(e.target.value) || 0)} className="w-24 h-8 text-xs font-mono bg-transparent border-none p-0 text-slate-900 dark:text-white" />
                    <MinusCircle className="w-4 h-4 text-rose-500 cursor-pointer" onClick={() => removeParcela(i)} />
                  </div>
                ))}
              </div>
              <Button onClick={addParcelaManual} variant="outline" className="w-full border-dashed text-slate-500"><PlusCircle className="w-4 h-4 mr-2" /> Adicionar Parcela Manual</Button>
            </div>
          </div>

          {/* ✅ NOVO: observações */}
          <div className="space-y-1.5 pb-2">
            <Label>Observações</Label>
            <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3}
                      placeholder="Condições especiais, negociações, acordos..."
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#075BFF]" />
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={fecharForm}>Cancelar</Button>
            {editingId ? (
              <Button onClick={() => save(editingStatus || "aprovado")} className="bg-[#075BFF]">Salvar alterações</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => save("orcamento")} className="border-[#075BFF] text-[#075BFF] hover:bg-blue-50">Salvar como Orçamento</Button>
                <Button onClick={() => save("aprovado")} className="bg-[#075BFF]">Criar Pedido (Aprovado)</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ NOVO: Visualização individual do pedido */}
      <Dialog open={!!verPed} onOpenChange={v => { if (!v) { setVerPed(null); setNfEdit(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {verPed && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-3">
                  Pedido {verPed.numero} <StatusBadge status={verPed.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm py-2">
                {[
                  ["Nº do pedido (ref.)", verPed.numero_referencia || "—"],
                  ["Cliente", clientes.find(c => c.id === verPed.cliente_id)?.nome_fantasia || clientes.find(c => c.id === verPed.cliente_id)?.razao_social || "—"],
                  ["Representada", reps.find(r => r.id === verPed.representada_id)?.nome_fantasia || "—"],
                  ["Data do pedido", fmtDate(verPed.data_pedido)],
                  ["Data de emissão", verPed.data_emissao ? fmtDate(verPed.data_emissao) : "—"],
                  ["Nota(s) fiscal(is)", verPed.nf_numero || "—"],
                  ["Valor total", fmtBRL(verPed.total)],
                  ["Faturado", fmtBRL(verPed.valor_faturado_total || 0)],
                  ["Comissão prevista", `${fmtBRL(verPed.comissao_valor || 0)} (${verPed.comissao_percentual ?? "-"}%)`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-slate-500">{k}</p>
                    <p className="font-semibold text-slate-900 dark:text-white break-words">{v}</p>
                  </div>
                ))}
              </div>

              {verPed.observacoes && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-slate-500 mb-1">Observações</p>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{verPed.observacoes}</p>
                </div>
              )}

              <div className="pt-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Itens</p>
                <div className="space-y-1">
                  {(verPed.itens || []).map((it, i) => (
                    <div key={i} className="flex justify-between text-sm border-b border-slate-100 dark:border-slate-800 py-1">
                      <span className="text-slate-700 dark:text-slate-300">{it.quantidade}x {it.nome}</span>
                      <span className="font-mono text-slate-900 dark:text-white">{fmtBRL(it.subtotal ?? it.quantidade * it.preco_unitario)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Faturamentos (notas fiscais)</p>
                {(verPed.faturamentos || []).length === 0 && <p className="text-sm text-slate-500">Ainda não faturado.</p>}
                <div className="space-y-2">
                  {(verPed.faturamentos || []).map(f => (
                    <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                      {nfEdit?.id === f.id ? (
                        <>
                          <Input value={nfEdit.nf_numero} onChange={e => setNfEdit({ ...nfEdit, nf_numero: e.target.value })} placeholder="Nº NF" className="w-28 h-8" />
                          <Input value={nfEdit.nf_serie} onChange={e => setNfEdit({ ...nfEdit, nf_serie: e.target.value })} placeholder="Série" className="w-20 h-8" />
                          <Input type="date" value={nfEdit.data_faturamento} onChange={e => setNfEdit({ ...nfEdit, data_faturamento: e.target.value })} className="w-40 h-8" />
                          <Button size="sm" onClick={salvarNF} className="h-8 bg-[#075BFF]"><Save className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setNfEdit(null)} className="h-8"><X className="w-3.5 h-3.5" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">NF {f.nf_numero}{f.nf_serie ? `/${f.nf_serie}` : ""}</span>
                          <span className="text-slate-500">{fmtDate(f.data_faturamento)}</span>
                          <span className="font-mono ml-auto text-slate-900 dark:text-white">{fmtBRL(f.valor_faturado)}</span>
                          <Button size="sm" variant="ghost" className="h-8" title="Corrigir NF"
                                  onClick={() => setNfEdit({ id: f.id, nf_numero: f.nf_numero || "", nf_serie: f.nf_serie || "", data_faturamento: toDateInput(f.data_faturamento) })}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {normParcelas(verPed.parcelas).length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Parcelas do pedido</p>
                  {normParcelas(verPed.parcelas).map((pc, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">{i + 1}ª · {fmtDate(pc.vencimento)}</span>
                      <span className="font-mono text-slate-900 dark:text-white">{fmtBRL(pc.valor)}</span>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter className="gap-2">
                {podeEditar(verPed.status) && (
                  <Button variant="outline" onClick={() => { const p = verPed; setVerPed(null); handleEdit(p); }}>
                    <Edit2 className="w-4 h-4 mr-2" /> Editar pedido
                  </Button>
                )}
                <Button variant="outline" onClick={() => gerarPDF(verPed)}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                <Button onClick={() => setVerPed(null)} className="bg-[#075BFF]">Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ NOVO: Modal de edição de parcelas (pedidos faturados) */}
      <Dialog open={parcOpen} onOpenChange={setParcOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Parcelas do Pedido {parcPed?.numero}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              As parcelas de comissão ainda não recebidas serão recalculadas proporcionalmente a estas parcelas, com os novos vencimentos.
            </p>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {parcList.map((p, i) => (
                <div key={i} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-400 w-6">{i + 1}ª</span>
                  <Input type="date" value={p.vencimento} onChange={e => updateParcelaEdit(i, "vencimento", e.target.value)} className="flex-1 h-8 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                  <Input type="number" step="0.01" value={p.valor} onChange={e => updateParcelaEdit(i, "valor", parseFloat(e.target.value) || 0)} className="w-28 h-8 text-xs font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                  <MinusCircle className="w-4 h-4 text-rose-500 cursor-pointer shrink-0" onClick={() => removeParcelaEdit(i)} />
                </div>
              ))}
              {parcList.length === 0 && <p className="text-sm text-center text-slate-500 py-4">Nenhuma parcela cadastrada.</p>}
            </div>
            <Button onClick={addParcelaEdit} variant="outline" className="w-full border-dashed text-slate-500"><PlusCircle className="w-4 h-4 mr-2" /> Adicionar parcela</Button>
            <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-800 pt-3">
              <span className="text-slate-500">Soma: <b className="font-mono text-slate-900 dark:text-white">{fmtBRL(somaParcelas(parcList))}</b> / Total: <span className="font-mono">{fmtBRL(parcPed?.total || 0)}</span></span>
              {Math.abs(parcDiferenca) >= 0.01 && (
                <span className="text-amber-600 font-semibold text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Diferença {fmtBRL(parcDiferenca)}</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParcOpen(false)}>Cancelar</Button>
            <Button onClick={saveParcelas} disabled={savingParc} className="bg-[#075BFF]">
              {savingParc && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar parcelas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar Pedido {sharePedido?.numero}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500 text-center">Escolha por onde deseja enviar o resumo do pedido para o cliente.</p>

            {(() => {
              if (!sharePedido) return null;
              const cliente = clientes.find(c => c.id === sharePedido.cliente_id);
              const textoEncoded = gerarTextoCompartilhamento(sharePedido);
              const telefone = (cliente?.whatsapp || cliente?.telefone || "").replace(/\D/g, '');

              return (
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href={`https://wa.me/${telefone ? '55' + telefone : ''}?text=${textoEncoded}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShareOpen(false)}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${telefone ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'}`}
                  >
                    <MessageCircle className="w-8 h-8 mb-2" />
                    <span className="font-semibold">WhatsApp</span>
                    {!telefone && <span className="text-[10px] text-center mt-1">Cliente sem telefone</span>}
                  </a>

                  <a
                    href={`mailto:${cliente?.email || ''}?subject=Pedido ${sharePedido.numero}&body=${textoEncoded}`}
                    onClick={() => setShareOpen(false)}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${cliente?.email ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700' : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'}`}
                  >
                    <Mail className="w-8 h-8 mb-2" />
                    <span className="font-semibold">E-mail</span>
                    {!cliente?.email && <span className="text-[10px] text-center mt-1">Cliente sem e-mail</span>}
                  </a>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fatOpen} onOpenChange={setFatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Faturamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg flex justify-between">
              <div>
                <p className="text-sm text-slate-500">Saldo a Faturar</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{fmtBRL(selectedPed?.saldo_a_faturar || 0)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nº Nota Fiscal</Label><Input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={fatForm.nf_numero} onChange={e => setFatForm({...fatForm, nf_numero: e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Série</Label><Input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={fatForm.nf_serie} onChange={e => setFatForm({...fatForm, nf_serie: e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Data Faturamento</Label><Input type="date" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={fatForm.data_faturamento} onChange={e => setFatForm({...fatForm, data_faturamento: e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Valor Faturado (R$)</Label><Input type="number" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" step="0.01" value={fatForm.valor_faturado} onChange={e => setFatForm({...fatForm, valor_faturado: parseFloat(e.target.value || 0)})} /></div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
              <div className="flex justify-between items-center mb-2">
                <Label>Parcelas da Comissão</Label>
                <Button variant="outline" size="sm" onClick={gerarParcelasFaturamento}><Calculator className="w-3 h-3 mr-1"/> Calcular</Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(fatForm.parcelas || []).map((p, i) => (
                  <div key={i} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <Input type="date" value={toDateInput(p.vencimento)} onChange={e => updateParcelaFat(i, "vencimento", e.target.value)} className="flex-1 h-8 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                    <Input type="number" step="0.01" value={p.valor} onChange={e => updateParcelaFat(i, "valor", parseFloat(e.target.value) || 0)} className="w-24 h-8 text-xs font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                  </div>
                ))}
              </div>
              {(fatForm.parcelas || []).length === 0 && (
                <p className="text-[11px] text-slate-500 mt-1">Sem parcelas: o sistema usa as parcelas do pedido.</p>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFatOpen(false)}>Cancelar</Button><Button onClick={faturar} className="bg-emerald-600">Confirmar Faturamento</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cliOpen} onOpenChange={setCliOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastro Rápido de Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5 relative"><Label>CNPJ</Label><Input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={newCli.cnpj_cpf} onChange={e => setNewCli({...newCli, cnpj_cpf: e.target.value})} onBlur={e => buscarCNPJ(e.target.value)} />{loadingCnpj && <Loader2 className="absolute right-3 top-8 w-4 h-4 animate-spin text-blue-500" />}</div>
            <div className="space-y-1.5"><Label>Razão Social *</Label><Input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={newCli.razao_social} onChange={e => setNewCli({...newCli, razao_social: e.target.value})} /></div>
            <div className="space-y-1.5"><Label>Nome Fantasia</Label><Input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={newCli.nome_fantasia} onChange={e => setNewCli({...newCli, nome_fantasia: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={saveNewCli} className="bg-[#075BFF]">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
