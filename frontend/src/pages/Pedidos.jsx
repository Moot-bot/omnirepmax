import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, Trash2, Calculator, UserPlus, Loader2, Edit2, Landmark, PlusCircle, MinusCircle, FileText, Download, FileCheck } from "lucide-react";
import { fmtBRL, fmtDate } from "../lib/format";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Pedidos() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  
  // Filtro de Abas
  const [tab, setTab] = useState("todos");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cliente_id: "", representada_id: "", condicao_pagamento: "30/60", itens: [], parcelas: [] });
  const [editingId, setEditingId] = useState(null);
  const [selectedProd, setSelectedProd] = useState("");
  const [qtd, setQtd] = useState(1);
  
  const [fatOpen, setFatOpen] = useState(false);
  const [selectedPed, setSelectedPed] = useState(null);
  const [fatForm, setFatForm] = useState({ nf_numero: "", nf_serie: "", data_faturamento: "", valor_faturado: 0, parcelas: [] });
  
  const [cliOpen, setCliOpen] = useState(false);
  const [newCli, setNewCli] = useState({ razao_social: "", nome_fantasia: "", cnpj_cpf: "", cidade: "", estado: "" });
  const [loadingCnpj, setLoadingCnpj] = useState(false);

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
    setForm({ ...form, itens: [...form.itens, { produto_id: p.id, nome: p.nome, quantidade: qtd, preco_unitario: p.preco_tabela, desconto: 0 }] });
    setSelectedProd(""); setQtd(1);
  };

  const removeItem = (idx) => { const n = [...form.itens]; n.splice(idx, 1); setForm({ ...form, itens: n }); };
  const calcTotal = () => form.itens.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0);

  const gerarParcelas = () => {
    const total = calcTotal();
    if (total <= 0) return toast.error("Adicione itens primeiro");
    const dias = form.condicao_pagamento.split("/").map(d => parseInt(d.trim()) || 30);
    const valorParcela = total / dias.length;
    const parcelas = dias.map(d => {
      const dt = new Date(); dt.setDate(dt.getDate() + d);
      return { vencimento: dt.toISOString().split('T')[0], valor: Math.round(valorParcela * 100) / 100 };
    });
    setForm({ ...form, parcelas });
  };

  const addParcelaManual = () => {
    const total = calcTotal();
    const restante = total - form.parcelas.reduce((acc, p) => acc + p.valor, 0);
    const dt = new Date(); dt.setDate(dt.getDate() + 30);
    setForm({ ...form, parcelas: [...form.parcelas, { vencimento: dt.toISOString().split('T')[0], valor: Math.max(0, restante) }] });
  };

  const updateParcela = (idx, field, value) => {
    const novas = [...form.parcelas]; novas[idx][field] = value; setForm({ ...form, parcelas: novas });
  };
  const removeParcela = (idx) => { const novas = [...form.parcelas]; novas.splice(idx, 1); setForm({ ...form, parcelas: novas }); };

  const save = async (statusFinal = "rascunho") => {
    if (!form.cliente_id || !form.representada_id) return toast.error("Selecione Cliente e Representada");
    if (form.itens.length === 0) return toast.error("Adicione itens");
    try {
      const payload = { ...form, status: statusFinal };
      if (editingId) await api.put(`/pedidos/${editingId}`, payload);
      else await api.post("/pedidos", payload);
      toast.success(editingId ? "Pedido atualizado!" : (statusFinal === "orcamento" ? "Orçamento salvo!" : "Pedido criado!"));
      setOpen(false); setForm({ cliente_id: "", representada_id: "", condicao_pagamento: "30/60", itens: [], parcelas: [] }); setEditingId(null); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao salvar pedido"); }
  };

  const handleEdit = (p) => {
    setForm({ cliente_id: p.cliente_id, representada_id: p.representada_id, condicao_pagamento: p.condicao_pagamento, itens: p.itens, parcelas: p.parcelas || [] });
    setEditingId(p.id); setOpen(true);
  };

  const handleOpenFat = (p) => {
    setSelectedPed(p);
    setFatForm({ nf_numero: "", nf_serie: "", valor_faturado: p.saldo_a_faturar || p.total, data_faturamento: new Date().toISOString().split('T')[0], parcelas: [] });
    setFatOpen(true);
  };

  const gerarParcelasFaturamento = () => {
    const rep = reps.find(r => r.id === selectedPed.representada_id);
    const percentual = rep?.comissao_padrao || 5;
    const valorComissao = fatForm.valor_faturado * (percentual / 100);
    const dias = (rep?.prazo_pagamento || "30").split("/").map(d => parseInt(d.trim()) || 30);
    const valParcela = valorComissao / dias.length;
    const parcelas = dias.map(d => {
      const dt = new Date(); dt.setDate(dt.getDate() + d);
      return { vencimento: dt.toISOString().split('T')[0], valor: Math.round(valParcela * 100) / 100 };
    });
    setFatForm({ ...fatForm, parcelas });
  };

  const faturar = async () => {
    if (!fatForm.nf_numero.trim()) return toast.error("Informe a NF");
    if (fatForm.valor_faturado <= 0) return toast.error("Informe o valor faturado");
    try {
      await api.post(`/pedidos/${selectedPed.id}/faturamento`, fatForm);
      toast.success("Faturamento registrado!"); 
      setFatOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao registrar faturamento"); }
  };

  // ✅ NOVO: GERAÇÃO DE PDF
  const gerarPDF = (p) => {
    const cliente = clientes.find(c => c.id === p.cliente_id);
    const rep = reps.find(r => r.id === p.representada_id);
    
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text(`Pedido: ${p.numero}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${fmtDate(p.data_pedido)}`, 14, 28);
    doc.text(`Status: ${p.status.toUpperCase()}`, 14, 33);

    // Dados do Cliente / Representada
    doc.setFontSize(12);
    doc.text("Cliente:", 14, 45);
    doc.setFontSize(10);
    doc.text(`${cliente?.razao_social || "N/A"}`, 14, 50);
    doc.text(`CNPJ: ${cliente?.cnpj_cpf || "N/A"}`, 14, 55);
    
    doc.setFontSize(12);
    doc.text("Representada:", 120, 45);
    doc.setFontSize(10);
    doc.text(`${rep?.nome_fantasia || "N/A"}`, 120, 50);

    // Tabela de Itens
    const body = p.itens.map(it => [
      it.nome,
      it.quantidade,
      fmtBRL(it.preco_unitario),
      fmtBRL(it.quantidade * it.preco_unitario)
    ]);

    doc.autoTable({
      startY: 65,
      head: [['Produto', 'Qtd', 'Preço Unit.', 'Total']],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [7, 91, 255] }
    });

    // Totalizadores
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total: ${fmtBRL(p.total)}`, 14, finalY);
    
    if (p.valor_faturado_total > 0) {
      doc.text(`Faturado: ${fmtBRL(p.valor_faturado_total)}`, 14, finalY + 7);
      doc.setFont(undefined, 'bold');
      doc.text(`Saldo a Faturar: ${fmtBRL(p.saldo_a_faturar)}`, 14, finalY + 14);
    }

    doc.save(`Pedido_${p.numero}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  // Filtro das Abas
  const pedidosFiltrados = list.filter(p => {
    if (tab === "aguardando") return p.status === "aprovado" || p.status === "enviado" || p.status === "faturado_parcial" || p.status === "rascunho";
    if (tab === "faturados") return p.status === "faturado";
    return true;
  });

  return (
    <div className="pb-10">
      <PageHeader title="Pedidos" subtitle="Lançamento e Faturamento" actions={
        <Button onClick={() => { setForm({ cliente_id: "", representada_id: "", condicao_pagamento: "30/60", itens: [], parcelas: [] }); setEditingId(null); setOpen(true); }} className="bg-[#075BFF]">
          <Plus className="w-4 h-4 mr-2" /> Novo Pedido / Orçamento
        </Button>
      } />

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="aguardando">Aguardando Faturamento</TabsTrigger>
          <TabsTrigger value="faturados">Totalmente Faturados</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-5 py-4 text-left text-slate-700 dark:text-slate-300">Nº Pedido</th>
              <th className="px-5 py-4 text-left text-slate-700 dark:text-slate-300">Cliente / Representada</th>
              <th className="px-5 py-4 text-right text-slate-700 dark:text-slate-300">Total</th>
              <th className="px-5 py-4 text-right text-amber-600">A Faturar</th>
              <th className="px-5 py-4 text-center text-slate-700 dark:text-slate-300">Status</th>
              <th className="px-5 py-4 text-right text-slate-700 dark:text-slate-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map(p => (
              <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-white">{p.numero}</td>
                <td className="px-5 py-3">
                  <div className="font-semibold text-slate-900 dark:text-white">{clientes.find(c => c.id === p.cliente_id)?.nome_fantasia}</div>
                  <div className="text-xs text-slate-500">{reps.find(r => r.id === p.representada_id)?.nome_fantasia}</div>
                </td>
                <td className="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmtBRL(p.total)}</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-500">
                  {p.saldo_a_faturar > 0 ? fmtBRL(p.saldo_a_faturar) : "-"}
                </td>
                <td className="px-5 py-3 text-center"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-3 text-right space-x-1 flex items-center justify-end">
                  <Button variant="ghost" size="sm" onClick={() => gerarPDF(p)} title="Gerar PDF" className="text-slate-500 hover:text-[#075BFF]">
                    <Download className="w-4 h-4" />
                  </Button>
                  {(p.status === "rascunho" || p.status === "enviado") && (
                    <Button size="sm" variant="outline" onClick={() => handleEdit(p)} title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {p.status !== "faturado" && p.status !== "orcamento" && (
                    <Button size="sm" onClick={() => handleOpenFat(p)} className="bg-emerald-600 hover:bg-emerald-700 h-8">
                      <FileCheck className="w-3.5 h-3.5 mr-1" /> Faturar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {pedidosFiltrados.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Nenhum pedido encontrado nesta aba.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE PEDIDO (Mantido com adição do botão Orçamento) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Pedido" : "Novo Pedido / Orçamento"}</DialogTitle></DialogHeader>
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
                  {form.itens.map((it, i) => (
                    <div key={i} className="flex justify-between text-sm bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                      <span>{it.quantidade}x {it.nome}</span>
                      <div className="flex items-center gap-2 font-mono text-slate-900 dark:text-white">{fmtBRL(it.quantidade * it.preco_unitario)} <Trash2 className="w-3.5 h-3.5 text-rose-500 cursor-pointer" onClick={() => removeItem(i)}/></div>
                    </div>
                  ))}
                </div>
                {form.itens.length > 0 && <div className="text-right font-bold pt-2 text-lg dark:text-white">Total: {fmtBRL(calcTotal())}</div>}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base">Parcelamento</Label>
                <Button onClick={gerarParcelas} variant="secondary" size="sm" disabled={form.itens.length === 0}><Calculator className="w-4 h-4 mr-1" /> Auto-Calcular</Button>
              </div>
              <div className="space-y-1.5">
                <Label>Condição para Auto-Cálculo</Label>
                <Input className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={form.condicao_pagamento} onChange={e => setForm({...form, condicao_pagamento: e.target.value})} placeholder="Ex: 30/60/90" />
              </div>
              <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto pr-2">
                {form.parcelas.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-400 w-6">{i+1}ª</span>
                    <Input type="date" value={p.vencimento.split('T')[0]} onChange={e => updateParcela(i, "vencimento", e.target.value)} className="flex-1 h-8 text-xs bg-transparent border-none p-0 text-slate-900 dark:text-white" />
                    <Input type="number" value={p.valor} onChange={e => updateParcela(i, "valor", parseFloat(e.target.value))} className="w-24 h-8 text-xs font-mono bg-transparent border-none p-0 text-slate-900 dark:text-white" />
                    <MinusCircle className="w-4 h-4 text-rose-500 cursor-pointer" onClick={() => removeParcela(i)} />
                  </div>
                ))}
              </div>
              <Button onClick={addParcelaManual} variant="outline" className="w-full border-dashed text-slate-500"><PlusCircle className="w-4 h-4 mr-2" /> Adicionar Parcela Manual</Button>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="outline" onClick={() => save("orcamento")} className="border-[#075BFF] text-[#075BFF] hover:bg-blue-50">Salvar como Orçamento</Button>
            <Button onClick={() => save("aprovado")} className="bg-[#075BFF]">Criar Pedido (Aprovado)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAIS DE FATURAMENTO E CLIENTE RÁPIDO (MANTIDOS) */}
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
                {fatForm.parcelas.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <Input type="date" value={p.vencimento} onChange={e => { const n = [...fatForm.parcelas]; n[i].vencimento = e.target.value; setFatForm({...fatForm, parcelas: n}); }} className="flex-1 h-8 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                    <Input type="number" value={p.valor} onChange={e => { const n = [...fatForm.parcelas]; n[i].valor = parseFloat(e.target.value); setFatForm({...fatForm, parcelas: n}); }} className="w-24 h-8 text-xs font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                  </div>
                ))}
              </div>
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