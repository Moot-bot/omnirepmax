import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Trash2, FileText, CheckCircle, Calculator } from "lucide-react";
import { fmtBRL } from "../lib/format";
import { toast } from "sonner";

export default function Pedidos() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cliente_id: "", representada_id: "", condicao_pagamento: "30/60", itens: [], parcelas: [] });
  const [selectedProd, setSelectedProd] = useState("");
  const [qtd, setQtd] = useState(1);

  // Estados para Faturamento
  const [fatOpen, setFatOpen] = useState(false);
  const [selectedPed, setSelectedPed] = useState(null);
  const [nfNum, setNfNum] = useState("");

  const load = useCallback(async () => {
    try {
      const [pRes, rRes, cRes] = await Promise.all([
        api.get("/pedidos"), 
        api.get("/representadas"), 
        api.get("/clientes")
      ]);
      setList(pRes.data);
      setReps(rRes.data);
      setClientes(cRes.data);
    } catch {
      toast.error("Erro ao carregar pedidos.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Carrega produtos quando muda a representada
  useEffect(() => {
    if (form.representada_id) {
      api.get(`/produtos?representada_id=${form.representada_id}`).then(r => setProdutos(r.data));
    } else {
      setProdutos([]);
    }
  }, [form.representada_id]);

  const addItem = () => {
    const p = produtos.find(x => x.id === selectedProd);
    if (!p) return toast.error("Selecione um produto");
    const newItem = { produto_id: p.id, nome: p.nome, quantidade: qtd, preco_unitario: p.preco_tabela, desconto: 0 };
    setForm({ ...form, itens: [...form.itens, newItem] });
    setSelectedProd(""); setQtd(1);
  };

  const removeItem = (idx) => {
    const newItens = [...form.itens];
    newItens.splice(idx, 1);
    setForm({ ...form, itens: newItens });
  };

  // Calcula o total do pedido atual
  const calcTotal = () => form.itens.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0);

  // Gera as parcelas automaticamente com base na condição de pagamento
  const gerarParcelas = () => {
    const total = calcTotal();
    if (total <= 0) return toast.error("Adicione itens ao pedido primeiro");
    
    const parcelas = [];
    // Exemplo: "30/60/90" ou "30"
    const dias = form.condicao_pagamento.split("/").map(d => parseInt(d.trim()) || 30);
    const valorParcela = total / dias.length;

    dias.forEach(d => {
      const dt = new Date();
      dt.setDate(dt.getDate() + d);
      parcelas.push({ vencimento: dt.toISOString(), valor: round2(valorParcela) });
    });

    setForm({ ...form, parcelas });
    toast.success(`${parcelas.length} parcelas geradas!`);
  };

  const round2 = (n) => Math.round(n * 100) / 100;

  const save = async () => {
    if (!form.cliente_id || !form.representada_id) return toast.error("Selecione Cliente e Representada");
    if (form.itens.length === 0) return toast.error("Adicione pelo menos um produto");
    try {
      await api.post("/pedidos", form);
      toast.success("Pedido criado com sucesso!");
      setOpen(false); 
      setForm({ cliente_id: "", representada_id: "", condicao_pagamento: "30/60", itens: [], parcelas: [] });
      load();
    } catch { 
      toast.error("Erro ao criar pedido"); 
    }
  };

  const faturar = async () => {
    if (!nfNum.trim()) return toast.error("Informe o número da NF");
    try {
      await api.patch(`/pedidos/${selectedPed.id}/status`, { status: "faturado", nf_numero: nfNum });
      toast.success("Pedido faturado! Comissões e parcelas geradas.");
      setFatOpen(false); load();
    } catch { 
      toast.error("Erro ao faturar"); 
    }
  };

  return (
    <div className="pb-10">
      <PageHeader 
        title="Pedidos" 
        subtitle="Lançamento, parcelamento e faturamento de pedidos" 
        actions={
          <Button onClick={() => { setForm({ cliente_id: "", representada_id: "", condicao_pagamento: "30/60", itens: [], parcelas: [] }); setOpen(true); }} className="bg-[#075BFF]">
            <Plus className="w-4 h-4 mr-2" /> Novo Pedido
          </Button>
        } 
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Nº Pedido</th>
                <th className="px-5 py-4 text-left font-semibold">Cliente / Representada</th>
                <th className="px-5 py-4 text-right font-semibold">Valor Total</th>
                <th className="px-5 py-4 text-center font-semibold">Status</th>
                <th className="px-5 py-4 text-center font-semibold">NF</th>
                <th className="px-5 py-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-white">{p.numero}</td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {clientes.find(c => c.id === p.cliente_id)?.nome_fantasia || "Cliente"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {reps.find(r => r.id === p.representada_id)?.nome_fantasia || "Representada"}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold">{fmtBRL(p.total)}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 text-center text-xs">{p.nf_numero || "-"}</td>
                  <td className="px-5 py-3 text-right">
                    {p.status !== "faturado" && (
                      <Button 
                        size="sm" 
                        onClick={() => { setSelectedPed(p); setNfNum(""); setFatOpen(true); }} 
                        className="bg-emerald-600 hover:bg-emerald-700 h-8"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Faturar
                      </Button>
                    )}
                    {p.status === "faturado" && (
                      <span className="text-xs text-emerald-600 font-semibold">✓ Faturado</span>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">Nenhum pedido cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Novo Pedido */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Pedido</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Representada (Fábrica)</Label>
                <Select value={form.representada_id} onValueChange={v => setForm({...form, representada_id: v, itens: []})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{reps.map(r => <SelectItem key={r.id} value={r.id}>{r.nome_fantasia}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Adicionar Itens */}
            <div className="border p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
              <Label className="text-sm font-semibold">Itens do Pedido</Label>
              <div className="flex gap-2">
                <Select value={selectedProd} onValueChange={setSelectedProd} disabled={!form.representada_id}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={form.representada_id ? "Produto..." : "Selecione a representada"} /></SelectTrigger>
                  <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} - {fmtBRL(p.preco_tabela)}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" className="w-20" value={qtd} onChange={e => setQtd(parseInt(e.target.value) || 1)} min={1} />
                <Button onClick={addItem} variant="outline">+ Add</Button>
              </div>
              <div className="space-y-1">
                {form.itens.map((it, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-white dark:bg-slate-900 p-2 rounded border">
                    <span>{it.quantidade}x {it.nome}</span>
                    <span className="font-mono flex items-center gap-2">
                      {fmtBRL(it.quantidade * it.preco_unitario)} 
                      <Trash2 className="w-3.5 h-3.5 text-rose-500 cursor-pointer" onClick={() => removeItem(i)}/>
                    </span>
                  </div>
                ))}
                {form.itens.length > 0 && (
                  <div className="text-right font-bold pt-2">Total: {fmtBRL(calcTotal())}</div>
                )}
              </div>
            </div>

            {/* Parcelamento */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Condição de Pagamento</Label>
                <Input 
                  value={form.condicao_pagamento} 
                  onChange={e => setForm({...form, condicao_pagamento: e.target.value})} 
                  placeholder="Ex: 30/60/90" 
                />
              </div>
              <Button onClick={gerarParcelas} variant="secondary" disabled={form.itens.length === 0}>
                <Calculator className="w-4 h-4 mr-2" /> Calcular Parcelas
              </Button>
            </div>

            {form.parcelas.length > 0 && (
              <div className="border rounded-lg p-3 bg-emerald-50 dark:bg-emerald-500/10">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  {form.parcelas.length} parcelas geradas:
                </p>
                <div className="space-y-1">
                  {form.parcelas.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{new Date(p.vencimento).toLocaleDateString('pt-BR')}</span>
                      <span className="font-mono font-bold">{fmtBRL(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#075BFF]">Salvar Pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Faturamento */}
      <Dialog open={fatOpen} onOpenChange={setFatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Faturamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              Ao confirmar, a comissão será gerada e dividida nas parcelas do pedido.
            </p>
            <div className="space-y-1.5">
              <Label>Número da Nota Fiscal</Label>
              <Input value={nfNum} onChange={e => setNfNum(e.target.value)} placeholder="Ex: 12345" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFatOpen(false)}>Cancelar</Button>
            <Button onClick={faturar} className="bg-emerald-600">Confirmar e Faturar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}