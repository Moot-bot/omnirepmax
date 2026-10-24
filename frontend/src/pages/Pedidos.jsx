import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Trash2, CheckCircle, Calculator, UserPlus, Loader2 } from "lucide-react";
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

  // NOVO: Estados para Cadastro Rápido de Cliente
  const [cliOpen, setCliOpen] = useState(false);
  const [newCli, setNewCli] = useState({ razao_social: "", nome_fantasia: "", cnpj_cpf: "", cidade: "", estado: "" });
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pRes, rRes, cRes] = await Promise.all([
        api.get("/pedidos"), api.get("/representadas"), api.get("/clientes")
      ]);
      setList(pRes.data); setReps(rRes.data); setClientes(cRes.data);
    } catch { toast.error("Erro ao carregar dados."); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (form.representada_id) {
      api.get(`/produtos?representada_id=${form.representada_id}`).then(r => setProdutos(r.data));
    } else { setProdutos([]); }
  }, [form.representada_id]);

  // --- Lógica de Novo Cliente Rápido ---
  const buscarCNPJ = async (cnpjRaw) => {
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) return;
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await res.json();
      setNewCli(prev => ({
        ...prev,
        razao_social: data.razao_social || prev.razao_social,
        nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
        cidade: data.municipio || prev.cidade,
        estado: data.uf || prev.estado,
      }));
      toast.success("CNPJ localizado!");
    } catch { toast.error("Erro ao buscar CNPJ."); } 
    finally { setLoadingCnpj(false); }
  };

  const saveNewCli = async () => {
    if (!newCli.razao_social) return toast.error("Razão Social é obrigatória");
    try {
      const res = await api.post("/clientes", { ...newCli, status: "ativo" });
      toast.success("Cliente cadastrado!");
      setClientes([...clientes, res.data]);
      setForm({ ...form, cliente_id: res.data.id }); // Já seleciona no pedido
      setCliOpen(false);
      setNewCli({ razao_social: "", nome_fantasia: "", cnpj_cpf: "", cidade: "", estado: "" });
    } catch { toast.error("Erro ao cadastrar cliente."); }
  };

  // --- Lógica de Itens e Parcelas ---
  const addItem = () => {
    const p = produtos.find(x => x.id === selectedProd);
    if (!p) return toast.error("Selecione um produto");
    const newItem = { produto_id: p.id, nome: p.nome, quantidade: qtd, preco_unitario: p.preco_tabela, desconto: 0 };
    setForm({ ...form, itens: [...form.itens, newItem] });
    setSelectedProd(""); setQtd(1);
  };

  const removeItem = (idx) => {
    const newItens = [...form.itens]; newItens.splice(idx, 1);
    setForm({ ...form, itens: newItens });
  };

  const calcTotal = () => form.itens.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0);

  const gerarParcelas = () => {
    const total = calcTotal();
    if (total <= 0) return toast.error("Adicione itens primeiro");
    const dias = form.condicao_pagamento.split("/").map(d => parseInt(d.trim()) || 30);
    const valorParcela = total / dias.length;
    const parcelas = dias.map(d => {
      const dt = new Date(); dt.setDate(dt.getDate() + d);
      return { vencimento: dt.toISOString(), valor: Math.round(valorParcela * 100) / 100 };
    });
    setForm({ ...form, parcelas });
    toast.success(`${parcelas.length} parcelas geradas!`);
  };

  const save = async () => {
    if (!form.cliente_id || !form.representada_id) return toast.error("Selecione Cliente e Representada");
    if (form.itens.length === 0) return toast.error("Adicione itens");
    try {
      await api.post("/pedidos", form);
      toast.success("Pedido criado!");
      setOpen(false); setForm({ cliente_id: "", representada_id: "", condicao_pagamento: "30/60", itens: [], parcelas: [] });
      load();
    } catch { toast.error("Erro ao criar pedido"); }
  };

  const faturar = async () => {
    if (!nfNum.trim()) return toast.error("Informe a NF");
    try {
      await api.patch(`/pedidos/${selectedPed.id}/status`, { status: "faturado", nf_numero: nfNum });
      toast.success("Pedido faturado!");
      setFatOpen(false); load();
    } catch { toast.error("Erro ao faturar"); }
  };

  return (
    <div className="pb-10">
      <PageHeader title="Pedidos" subtitle="Lançamento e Faturamento" actions={
        <Button onClick={() => { setForm({ cliente_id: "", representada_id: "", condicao_pagamento: "30/60", itens: [], parcelas: [] }); setOpen(true); }} className="bg-[#075BFF]">
          <Plus className="w-4 h-4 mr-2" /> Novo Pedido
        </Button>
      } />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/80 border-b">
            <tr>
              <th className="px-5 py-4 text-left">Nº Pedido</th>
              <th className="px-5 py-4 text-left">Cliente / Representada</th>
              <th className="px-5 py-4 text-right">Total</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="px-5 py-4 text-center">NF</th>
              <th className="px-5 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="border-b hover:bg-slate-50">
                <td className="px-5 py-3 font-mono font-bold">{p.numero}</td>
                <td className="px-5 py-3">
                  <div className="font-semibold">{clientes.find(c => c.id === p.cliente_id)?.nome_fantasia}</div>
                  <div className="text-xs text-slate-500">{reps.find(r => r.id === p.representada_id)?.nome_fantasia}</div>
                </td>
                <td className="px-5 py-3 text-right font-mono">{fmtBRL(p.total)}</td>
                <td className="px-5 py-3 text-center"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-3 text-center text-xs">{p.nf_numero || "-"}</td>
                <td className="px-5 py-3 text-right">
                  {p.status !== "faturado" && (
                    <Button size="sm" onClick={() => { setSelectedPed(p); setNfNum(""); setFatOpen(true); }} className="bg-emerald-600 h-8">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Faturar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Novo Pedido */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Pedido</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Representada</Label>
                <Select value={form.representada_id} onValueChange={v => setForm({...form, representada_id: v, itens: []})}>
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
                  <Button variant="outline" onClick={() => setCliOpen(true)} title="Cadastrar novo cliente"><UserPlus className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>

            <div className="border p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
              <Label>Itens</Label>
              <div className="flex gap-2">
                <Select value={selectedProd} onValueChange={setSelectedProd} disabled={!form.representada_id}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Produto..." /></SelectTrigger>
                  <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} - {fmtBRL(p.preco_tabela)}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" className="w-20" value={qtd} onChange={e => setQtd(parseInt(e.target.value) || 1)} min={1} />
                <Button onClick={addItem} variant="outline">Add</Button>
              </div>
              {form.itens.map((it, i) => (
                <div key={i} className="flex justify-between text-sm bg-white dark:bg-slate-900 p-2 rounded border">
                  <span>{it.quantidade}x {it.nome}</span>
                  <div className="flex items-center gap-2 font-mono">
                    {fmtBRL(it.quantidade * it.preco_unitario)} <Trash2 className="w-3.5 h-3.5 text-rose-500 cursor-pointer" onClick={() => removeItem(i)}/>
                  </div>
                </div>
              ))}
              {form.itens.length > 0 && <div className="text-right font-bold pt-2">Total: {fmtBRL(calcTotal())}</div>}
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Condição de Pagamento</Label>
                <Input value={form.condicao_pagamento} onChange={e => setForm({...form, condicao_pagamento: e.target.value})} placeholder="Ex: 30/60/90" />
              </div>
              <Button onClick={gerarParcelas} variant="secondary" disabled={form.itens.length === 0}>
                <Calculator className="w-4 h-4 mr-2" /> Calcular Parcelas
              </Button>
            </div>

            {form.parcelas.length > 0 && (
              <div className="border rounded-lg p-3 bg-emerald-50 dark:bg-emerald-500/10">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Parcelas geradas:</p>
                {form.parcelas.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs mb-1">
                    <span>{new Date(p.vencimento).toLocaleDateString('pt-BR')}</span>
                    <span className="font-mono font-bold">{fmtBRL(p.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#075BFF]">Salvar Pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Cliente Rápido */}
      <Dialog open={cliOpen} onOpenChange={setCliOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastro Rápido de Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5 relative">
              <Label>CNPJ (Busca Automática)</Label>
              <Input value={newCli.cnpj_cpf} onChange={e => setNewCli({...newCli, cnpj_cpf: e.target.value})} onBlur={e => buscarCNPJ(e.target.value)} placeholder="00.000.000/0000-00" />
              {loadingCnpj && <Loader2 className="absolute right-3 top-8 w-4 h-4 animate-spin text-blue-500" />}
            </div>
            <div className="space-y-1.5"><Label>Razão Social *</Label><Input value={newCli.razao_social} onChange={e => setNewCli({...newCli, razao_social: e.target.value})} /></div>
            <div className="space-y-1.5"><Label>Nome Fantasia</Label><Input value={newCli.nome_fantasia} onChange={e => setNewCli({...newCli, nome_fantasia: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Cidade</Label><Input value={newCli.cidade} onChange={e => setNewCli({...newCli, cidade: e.target.value})} /></div>
              <div className="space-y-1.5"><Label>UF</Label><Input value={newCli.estado} onChange={e => setNewCli({...newCli, estado: e.target.value})} maxLength={2} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCliOpen(false)}>Cancelar</Button>
            <Button onClick={saveNewCli} className="bg-[#075BFF]">Salvar e Selecionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Faturamento */}
      <Dialog open={fatOpen} onOpenChange={setFatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Faturamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">A comissão será gerada e as parcelas irão para o Contas a Receber.</p>
            <div className="space-y-1.5"><Label>Nota Fiscal</Label><Input value={nfNum} onChange={e => setNfNum(e.target.value)} placeholder="Número da NF" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFatOpen(false)}>Cancelar</Button>
            <Button onClick={faturar} className="bg-emerald-600">Faturar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}